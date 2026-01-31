import { CopyRenderer } from './ag-grid-copy-renderer.mjs';
import { AgGridExtensions } from './ag-grid-extension.mjs';

// @ts-ignore
export const agGrid = await import( 'https://cdn.jsdelivr.net/npm/ag-grid-community@35/+esm');

export const agGridBamzComponents = {} ;

agGridBamzComponents.CopyRenderer = CopyRenderer ;
agGridBamzComponents.columnOptionsTransformers = [] ;

const extensionExtendsClass = [] ;

function loadExtension(ext){
    console.log("load ag-grid extension", ext)
    if(ext.columnOptionsTransformer){
        agGridBamzComponents.columnOptionsTransformers.push({
            plugin: ext.plugin,
            transformer: ext.columnOptionsTransformer
        }) ;
    }
    if(ext.components){
        for(let [name, component] of Object.entries(ext.components)){
            if(!agGridBamzComponents[name]){
                agGridBamzComponents[name] = component ;
            }else{
                console.warn("Component already registered", name) ;
            }
        }
    }
    if(ext.extends){
        if(customElements.get("ag-grid")){
            //already loaded, extends now
            ext.extends(customElements.get("ag-grid")) ;
        }else{
            //will load on class definition
            extensionExtendsClass.push(ext.extends) ;
        }
    }
}

const extensionsAreLoaded = function(){
    if(loadingGridExtensions){ return false ; }
    return AgGridExtensions.extensions.every(ext=>ext.isLoaded) ;
}

let loadingGridExtensions = false ;
export const loadGridExtensions = async function(){
    try{
        if(loadingGridExtensions){
            await new Promise((resolve)=>{ setTimeout(resolve, 100) ; }) ;
            return await loadGridExtensions() ;
        }
        loadingGridExtensions = true ;
        //console.log("start load db components extension")
        for(let ext of AgGridExtensions.extensions){
            if(ext.isLoaded){ continue ; }
            ext.isLoaded = true ;
            if(ext.url){
                const impEx = await import(ext.url) ;
                let extensions = impEx.default ;
                if(!Array.isArray(extensions)){
                    extensions = [extensions] ;     
                }
                for(let ext of extensions){
                    loadExtension(ext) ;
                }
            }else{
                loadExtension(ext) ;
            }
        }
    }finally{
        loadingGridExtensions = false ;
    }
}


async function transformColumnOptions({options, html}){
    for(let transformer of agGridBamzComponents.columnOptionsTransformers){
        if(transformer.transformer){
            try{
                const transformedOptions = await transformer.transformer({options, html, agGridBamzComponents}) ;
                if(transformedOptions){
                    options = transformedOptions ;
                }
            }catch(err){
                console.error("Error in column options transformer", transformer.plugin, err) ;
            }
        }
    }
    return options ;
}

function attrNameToPropertyName(att){
    return att.split("-").map((v, i)=>{
        if(i>0){
            return v.substring(0,1).toUpperCase()+v.substring(1) ;
        }else{
            return v ;
        }
    }).join("") ;
}

function waitInsertedInDocument(element){
    // Wait until the element is inserted in the document
    // This is needed because the element may be created before the document is ready
    // and we need to wait until it is inserted in the document
    if(document.documentElement.contains(element)){ return Promise.resolve() ; }
    // If the element is not inserted in the document, we need to wait until it is inserted
    // We can use a MutationObserver to wait until the element is inserted in the document
    // The MutationObserver will observe the document body for changes
    // and will call the callback function when the element is inserted
    // The callback function will disconnect the observer and resolve the promise
    // The observer will be disconnected when the element is inserted in the document
    return new Promise((resolve)=>{
        const observer = new MutationObserver((mutations, observer) => {
            if (document.documentElement.contains(element)) {
                observer.disconnect();
                resolve();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true, });
    }) ;
}
// Wait for the element get opacity
// ag-grid need the element to by visible to apply theme correctly
function waitForElementVisibility(element) {
    return new Promise(resolve => {
      const checkVisibility = () => {
        const isVisible = element.checkVisibility({  opacityProperty: true});
        
        if (isVisible) {
            resolve(true);
        } else {
            // Not visible, wait and check again
            setTimeout(checkVisibility, 10);
        }
      };
      
      checkVisibility();
    });
}

function isMobileDisplay(){
    return window.innerWidth<1024 ;
}

const OPTIONS_NUMBER = [
    // all number options of https://www.ag-grid.com/javascript-data-grid/grid-options/
    "headerHeight", "groupHeaderHeight", "floatingFiltersHeight", 
    "pivotHeaderHeight", "pivotGroupHeaderHeight", "autoSizePadding", "undoRedoCellEditingLimit", 
    "detailRowHeight", "keepDetailRowsCount", "tabIndex", "rowBuffer",
    "paginationPageSize", "cellFlashDuration", "cellFadeDuration", "groupDefaultExpanded",
    "groupLockGroupColumns", "pivotDefaultExpanded", "pivotMaxGeneratedColumns", "asyncTransactionWaitMillis",
    "cacheOverflowSize", "maxConcurrentDatasourceRequests", "cacheBlockSize", "maxBlocksInCache",
    "infiniteInitialRowCount", "cacheBlockSize", "maxBlocksInCache", "maxConcurrentDatasourceRequests",
    "blockLoadDebounceMillis", "serverSideInitialRowCount", "viewportRowModelPageSize", "viewportRowModelBufferSize",
    "scrollbarWidth", "rowHeight", "tooltipShowDelay", "tooltipHideDelay", "groupDefaultExpanded",

    // all number option 
    "pivotIndex", "initialPivotIndex", "rowGroupIndex", "initialRowGroupIndex",
    "sortIndex", "initialSortIndex", "width", "initialWidth",
    "minWidth", "maxWidth", "flex", "initialFlex"
] ;

function attributesToOptions(element, options){
    for(let attr of element.attributes){
        if(attr.name.startsWith("z-")){ continue; }
        if(attr.name.startsWith("zz-")){ continue; }
        if(attr.name === "id"){ continue; }
        const propertyName = attrNameToPropertyName(attr.name);
        let attrValue = element[propertyName];
        if(attrValue == null){
            attrValue = element.getAttribute(attr.name);
        }
        if(typeof(attrValue) === "string"){
            // the attribute value is a string, check if it is a component name
            let componentName = attrValue ;
            let componentParams = null;
            if(attrValue.includes("(")){
                //component can have parameters like this MyComponent({param1: "value1", param2: "value2"})
                componentName = componentName.substring(0, attrValue.indexOf("("));
            }
            const component = agGridBamzComponents[componentName];
            if(component){
                //found in components
                if(typeof(component) === "function"){
                    //component is a function, it is a factory that create the component call it with parameters
                    if(attrValue.includes("(")){
                        // get the parameters from the string
                        componentParams = attrValue.substring(attrValue.indexOf("(")+1, attrValue.indexOf(")")).trim();
                        if(componentParams.startsWith("{")){
                            componentParams = new Function("return "+componentParams)();
                        }
                        attrValue = component.bind(element)(componentParams);
                    }else{
                        attrValue = component;
                    }
                }else{
                    attrValue = component ;
                }
            }else if(OPTIONS_NUMBER.includes(propertyName)){
                // the attribute value is a number, convert it to a number
                attrValue = Number(attrValue);
                if(isNaN(attrValue)){
                    console.warn("Attribute value is not a number", attr.name, attrValue) ;
                    attrValue = null ;
                }
            }
        }
        if(attrValue === ""){
            // if the attribute value is empty, set it to true
            attrValue = true ;
        }
        if(attrValue === "true"){
            attrValue = true;
        }else if(attrValue === "false"){
            attrValue = false;
        }

        const optPath = propertyName.split(".") ;
        let optObject = options;
        while(optPath.length>1){
            const p = optPath.shift() ;
            if(!optObject[p]){
                optObject[p] = {} ;
            }
            optObject = optObject[p] ;
        }
        optObject[optPath.shift()] = attrValue ;
    }
}

if(!customElements.get("ag-column")){
  
    class AgColumnElement extends HTMLElement {
        constructor() {
            super();
            if(this.innerHTML){
                this.html = this.innerHTML.trim() ;
                this.innerHTML = "" ;
                if(this.html.startsWith("<!--") && this.html.endsWith("-->")){
                    this.html = "";
                }
            }else{
                this.html = "";
            }
        }
    }
    customElements.define("ag-column", AgColumnElement);
}

if(!customElements.get("ag-mobile-render")){
  
    class AgMobileRender extends HTMLElement {
        constructor() {
            super();
            if(this.innerHTML){
                this.html = this.innerHTML.trim() ;
                this.innerHTML = "" ;
                if(this.html.startsWith("<!--") && this.html.endsWith("-->")){
                    this.html = "";
                }
            }else{
                this.html = "";
            }
        }

        get height(){
            return Number(this.getAttribute("height")||100)
        }
        set height(height){
            this.setAttribute("height", ""+height) ;
        }
    }
    customElements.define("ag-mobile-render", AgMobileRender);
}

if(!customElements.get("ag-default-column")){
  
    class AgDefaultColumnElement extends HTMLElement {
        constructor() {
            super();
            if(this.innerHTML){
                this.html = this.innerHTML.trim() ;
                this.innerHTML = "" ;
                if(this.html.startsWith("<!--") && this.html.endsWith("-->")){
                    this.html = "";
                }
            }else{
                this.html = "";
            }
        }
    }
    customElements.define("ag-default-column", AgDefaultColumnElement);
}

if(!customElements.get("ag-grid")){
  
    class AgGridElement extends HTMLElement {

        static defaultOptions = {
            theme: agGrid.themeQuartz
        }

        constructor() {
            super();
        }
        
        connectedCallback() {
            this.init() ;
        }

        async init(){
            // Register the module (https://www.ag-grid.com/javascript-data-grid/modules/)
            agGrid.ModuleRegistry.registerModules([
                agGrid.AllCommunityModule, 
            ]);
            // prepare grid options
            const gridOptions = {};

            // wait for the element to be inserted in the document
            // this is needed because the grid needs to be inserted in the document before it can be initialized
            await waitInsertedInDocument(this) ;
            await waitForElementVisibility(this) ;
            await loadGridExtensions() ;

            // get column definitions from child elements
            const columnElements = Array.prototype.slice.call(this.querySelectorAll("ag-column"));
            gridOptions.columnDefs = [] ;
            for(let col of columnElements){
                let options = {} ;
                attributesToOptions(col, options) ;
                let colHtml = col.html.trim();
                options = await transformColumnOptions({options, html: colHtml}) ;
                gridOptions.columnDefs.push(options);
            }

            // get default column definitions from child elements
            const defaultColumnElements = this.querySelector("ag-default-column");
            if(defaultColumnElements){
                gridOptions.defaultColDef = {} ;
                attributesToOptions(defaultColumnElements, gridOptions.defaultColDef) ;
                // @ts-ignore
                gridOptions.defaultColDef = await transformColumnOptions({options: gridOptions.defaultColDef}) ;
            }

            // set other options from attributes
            attributesToOptions(this, gridOptions) ;

            // set default options
            for(let [opt, value] of Object.entries(AgGridElement.defaultOptions)){
                if(gridOptions[opt] == null){
                    gridOptions[opt] = value ;
                }
            }

            if(typeof(gridOptions.theme) === "string"){
                if(agGrid[gridOptions.theme]){
                    gridOptions.theme = agGrid[gridOptions.theme] ;
                }else{
                    console.warn("Theme not found", gridOptions.theme) ;
                    delete gridOptions.theme ;
                }
            }

            if(this.mobileDisplay){
                const elMobileRender = this.querySelector("ag-mobile-render");
                if(elMobileRender){

                    this.classList.add("ag-grid-mobile") ;

                    // activate the full width cell display on mobile
                    gridOptions.isFullWidthRow = () => {
                        return this.mobileDisplay ;
                    } ;

                    gridOptions.rowHeight = elMobileRender.height ;
                    gridOptions.headerHeight = 0 ;

                    let fullWidthCellOption = {} ;
                    attributesToOptions(elMobileRender, fullWidthCellOption) ;

                    let colHtml = elMobileRender.html.trim();
                    fullWidthCellOption = await transformColumnOptions({options: fullWidthCellOption, html: colHtml}) ;

                    if(fullWidthCellOption.cellRenderer){
                        // @ts-ignore
                        gridOptions.fullWidthCellRenderer = fullWidthCellOption.cellRenderer ;
                        if(fullWidthCellOption.cellRendererParams){
                            gridOptions.fullWidthCellRendererParams = fullWidthCellOption.cellRendererParams ;
                        }
                    }else {
                        // @ts-ignore
                        gridOptions.fullWidthCellRenderer = () => colHtml ;
                    }
                }
            }
        
            this.grid = agGrid.createGrid(this, gridOptions);   
            
            // automatically dispatch a agGridEnterRow on double click on desktop and simple clich on mobile
            this.grid.addEventListener("rowDoubleClicked", (ev)=>{
                if(!isMobileDisplay()){
                    const evEnter = new CustomEvent("agGridEnterRow", { detail: ev.data, bubbles: true, composed: true }) ;
                    // @ts-ignore
                    evEnter.data = ev.data ;
                    this.dispatchEvent(evEnter);
                }
            }) ;
            this.grid.addEventListener("rowClicked", (ev)=>{
                if(isMobileDisplay()){
                    const evEnter = new CustomEvent("agGridEnterRow", { detail: ev.data, bubbles: true, composed: true }) ;
                    // @ts-ignore
                    evEnter.data = ev.data ;
                    this.dispatchEvent(evEnter);
                }
            }) ;
            this.dispatchEvent(new CustomEvent("agGridReady", { detail: this.grid, bubbles: true, composed: true }));
        }

        get mobileDisplay(){
            if(this._mobileDisplay != null){
                return this._mobileDisplay ;
            }
            return window.innerWidth<1024 ;
        }

        set mobileDisplay(mobileDisplay){
            this._mobileDisplay = mobileDisplay ;
        }

        get rowData(){
            if(!this.grid){
                // Grid not initialized yet, ignore
                return this._rowData;
            }
            return this.grid.getGridOption("rowData") ;
        }

        set rowData(rowData){
            this._rowData = rowData;
            this.getGrid().then(()=>{
                this.grid.setGridOption("rowData", rowData) ;
            });
        }

        getGrid(){
            return new Promise((resolve)=>{
                if(this.grid){
                    resolve(this.grid);
                }else{
                    this.addEventListener("agGridReady", ()=>{
                        resolve(this.grid);
                    });
                }
            });
        }


        addEventListener(name, callback, options){
            if(!extensionsAreLoaded()){
                //extension not loaded, wait all extension registered before adding event listener
                loadGridExtensions().then(()=>{
                    this.addEventListener(name, callback, options) ;
                }) ;
                return; 
            }
            if(agGrid._GET_ALL_EVENTS().includes(name)){
                this.getGrid().then(()=>{
                    this.grid.addEventListener(name, callback, options);
                });
            }else{
                HTMLElement.prototype.addEventListener.call(this, name, callback, options);
            }
        }

        removeEventListener(name, callback){
            if(agGrid._GET_ALL_EVENTS().includes(name)){
                this.getGrid().then(()=>{
                    this.grid.removeEventListener(name, callback);
                });
            }else{
                HTMLElement.prototype.removeEventListener.call(this, name, callback);
            }
        }

        updateOption(attrName){
            if(!this.grid){
                // Grid not initialized yet, ignore
                return ;
            }
            const propertyName = attrNameToPropertyName(attrName);
            let attrValue = this[propertyName];
            if(attrValue == null){
                attrValue = this.getAttribute(attrName);
            }
            this.grid.setGridOption(propertyName, attrValue);
        }

        static get observedAttributes() {
            return [
                "row-data"
            ];
        }
        
        attributeChangedCallback(name/*, oldValue, newValue*/) {
            switch(name){
                case "row-data":
                    this.updateOption(name);
                    break;
                default:
                    break;
            }
        }


    }
    customElements.define("ag-grid", AgGridElement);

    loadGridExtensions().then(()=>{
        for(let extender of extensionExtendsClass){
            extender(AgGridElement) ;
        }
    })
}




export default agGrid;