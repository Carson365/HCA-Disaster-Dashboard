export function updateFadeEffect() {
    //window.updateFadeEffect = () => {
        let topFade = document.querySelector(".topFade");
        let main = document.querySelector("main");
        if (!main || !topFade) return;

        let scrollY = main.scrollTop;
        topFade.style.height = Math.min(5, scrollY * 0.05) + "em";
/*    };*/
}


export function testing() {
    const topFade = document.querySelector(".topFade");
    const bottomFade = document.querySelector(".bottomFade");
    const scrollY = document.querySelector("main").scrollTop;
    topFade.style.height = Math.min(5, scrollY * 0.05) + "em";

    const rect = document.querySelector(".container").getBoundingClientRect();
    bottomFade.style.height = Math.min(5, Math.max(0, (rect.bottom - window.innerHeight) * 0.05)) + "em";
    console.log(Math.min(5, (rect.bottom - window.innerHeight) * 0.05));
}