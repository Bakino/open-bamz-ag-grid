import express from "express";

export const prepareDatabase = async () => {
    
}
export const initPlugin = async ({ contextOfApp, hasCurrentPlugin, loadPluginData }) => {

    const router = express.Router();
    

    router.get('/ag-grid-extensions', (req, res, next) => {
        (async ()=>{

            let appName = req.appName ;
            if(await hasCurrentPlugin(appName)){
            
                let appContext = await contextOfApp(appName) ;
                let allowedExtensions = appContext.pluginsData["open-bamz-ag-grid"]?.pluginSlots?.agGridExtensions??[] ;
                let js = `let extensions = [];`;
                for(let i=0; i<allowedExtensions.length; i++){
                    let ext = allowedExtensions[i];
                    js += `
                    import ext${i} from "${ext.extensionPath.replace(":appName", appName)}" ;
                    extensions.push({ plugin: "${ext.plugin}", ...ext${i}}) ;
                    `
                }
                js += `export default extensions`;
                res.setHeader("Content-Type", "application/javascript");
                res.end(js);
            }else{
                next() ;
            }
        })();
    });

    loadPluginData(async ({pluginsData})=>{
        if(pluginsData?.["open-bamz-grapesjs-editor"]?.pluginSlots?.grapesJsEditor){
            pluginsData?.["open-bamz-grapesjs-editor"]?.pluginSlots?.grapesJsEditor.push( {
                plugin: "ag-grid",
                extensionPath: "/plugin/open-bamz-ag-grid/editor/grapesjs-aggrid-extension.mjs"
            })
        }
        
    })

    return {
        // path in which the plugin provide its front end files
        frontEndPath: "front",
        frontEndPublic: "lib",
        frontEndLib: "lib/ag-grid-lib.mjs",
        router: router,
        //menu entries
        menu: [
            {
                name: "admin", entries: [
                    { name: "AG Grid", link: "/plugin/open-bamz-ag-grid/help/" }
                ]
            }
        ],
        pluginSlots: {
            agGridExtensions: [],
        }
        
    }
}