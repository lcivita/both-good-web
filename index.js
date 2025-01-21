document.addEventListener('DOMContentLoaded', function() {
    const backImage = document.querySelector('.image.back img');
    const frontImage = document.querySelector('.image.front img');
    const socialIcons = document.querySelector('.social-icons');
    const toggleButton = document.querySelector('.social-toggle');

    frontImage.addEventListener('mouseenter', () => {
        frontImage.style.transform = 'scale(1.1)';
        backImage.style.transform = 'scale(1.05)';
    });

    frontImage.addEventListener('mouseleave', () => {
        frontImage.style.transform = 'scale(1)';
        backImage.style.transform = 'scale(1)';
    });

});