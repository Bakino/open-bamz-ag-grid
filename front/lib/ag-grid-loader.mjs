import { AgGridExtensions } from "./ag-grid-extension.mjs";
AgGridExtensions.loadExtension({
    url : `/open-bamz-ag-grid/ag-grid-extensions`
}) ;
import { agGrid } from "./ag-grid-lib.mjs";

export async function loadCss (url){
    let head = document.head;
    if(head.querySelector(`link[href="${url}"]`)){
        return ;
    }
    return new Promise((resolve)=>{
        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = url;
        
        
        head.appendChild(link);
        resolve() ;
    }) ;
}

loadCss("/plugin/open-bamz-ag-grid/lib/ag-grid-lib.css",)

export default agGrid ;
