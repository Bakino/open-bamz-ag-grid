/* Javascript */

view.loader = async ()=>{
    return await (await fetch("./lotr.json")).json() ;
}