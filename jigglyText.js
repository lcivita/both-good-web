document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('h1').forEach(h1 => {
        let jigglyText = '';
        h1.textContent.split('').forEach(letter => {
            jigglyText += `<span class="jiggly">${letter}</span>`;
        });
        h1.innerHTML = jigglyText;
    });
});