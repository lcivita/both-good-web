document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.image-stack').forEach(stack => {
      const back  = stack.querySelector('.image.back img');
      const front = stack.querySelector('.image.front img');
      if (!front || !back) return;
  
      front.addEventListener('mouseenter', () => {
        front.style.transform = 'scale(1.1)';
        back.style.transform  = 'scale(1.05)';
      });
      front.addEventListener('mouseleave', () => {
        front.style.transform = 'scale(1)';
        back.style.transform  = 'scale(1)';
      });
    });
  });
  