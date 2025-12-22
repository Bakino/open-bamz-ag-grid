const ICON_COPY = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16">
    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/>
    </svg>` ;
const ICON_COPIED = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard-check" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0"/>
  <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
  <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/>
</svg>` ;
export class CopyRenderer {
    constructor() { }
   
    init(params) {
        this.params = params;
        if(!this.elCell){
            if(!document.head.querySelector('style[bamz-ag-grid-style="CopyRenderer"]')){
                const style = document.createElement('style');
                style.setAttribute('bamz-ag-grid-style', "CopyRenderer") ;
                style.innerHTML = `
                    .btn-copy{
                        background-color: white;
                        border: solid 1px #ccc;
                        border-radius: 4px;
                        padding: 4px 4px;
                        cursor: pointer;
                        color: #626262;
                        opacity: 0.1;
                        margin-left: auto;
                        transition: opacity 0.5s;
                    }
                    .btn-copy:hover{
                        opacity: 1;
                    }
                `;
                document.head.appendChild(style);
            }
            this.elCell = document.createElement('div');
            this.elCell.style.width = "100%" ;
            this.elCell.style.height = "100%" ;
            this.elCell.style.display = "flex" ;
            this.elCell.style.alignItems = "center" ;
            this.elValue = document.createElement('div');
            this.elValue.style.flexGrow = "1";
            this.elValue.style.overflow = "hidden" ;
            this.elCell.appendChild(this.elValue) ;
            if(navigator.clipboard){
                this.buttonCopy = document.createElement('button');
                this.buttonCopy.type = "button" ;

                this.buttonCopy.className = "btn-copy" ;
                this.buttonCopy.title = "Copy" ;
                this.buttonCopy.innerHTML = ICON_COPY ;
                this.buttonCopy.addEventListener("click", async (ev)=>{
                    ev.preventDefault() ;
                    ev.stopPropagation() ;
                    let str = this.params.value ;
                    if(params.getDataToCopy){
                        str = params.getDataToCopy(this.params) ;
                    }
                    await navigator.clipboard.writeText(str) ;
                    this.buttonCopy.innerHTML = ICON_COPIED;
                    this.buttonCopy.style.color = "#28a745" ;
                    setTimeout(()=>{
                        this.buttonCopy.innerHTML = ICON_COPY;
                        this.buttonCopy.style.color = "#333" ;
                    }, 1000)
                }) ;
                this.elCell.appendChild(this.buttonCopy) ;
            }

        }
        
        this.applyRenderedValue(params) ;
    }

    applyRenderedValue(params){
        const renderedValue = params.cellRenderer?params.cellRenderer(params):params.value ;
        if(typeof(renderedValue) === "string"){
            //it is raw HTML
            this.elValue.innerHTML = renderedValue ;
        }else if(renderedValue){
            //it is an HTML element
            this.elValue.innerHTML = "" ;
            this.elValue.appendChild(renderedValue) ;
        }else{
            //it is null
            this.elValue.innerHTML = "" ;
        }
        if(params.value != null){
            this.buttonCopy.style.display = "block" ;
        }else{
            this.buttonCopy.style.display = "none" ;
        }
    }

    getGui() {
        return this.elCell;
    }
    refresh(params) {
        this.params = params;
        this.applyRenderedValue(params) ;
        
        return true;
    }
    destroy() {
    }
}