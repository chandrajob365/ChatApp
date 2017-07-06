document.onreadystatechange = function(e)
{
    if (document.readyState === 'complete')
    {
        console.log('<localStorage.js onreadystatechange>, Entry')
        localStorage.clear()
    }
}
