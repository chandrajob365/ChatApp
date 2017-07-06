document.onreadystatechange = e => {
  if (document.readyState === 'complete') localStorage.clear()
}
