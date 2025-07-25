import { useEffect, useRef } from 'react';

export default function JigglyText({ children, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      const text = ref.current.textContent;
      const jigglyHTML = text.split('').map(letter => 
        `<span class="jiggly">${letter}</span>`
      ).join('');
      ref.current.innerHTML = jigglyHTML;
    }
  }, [children]);

  return <h1 ref={ref} className={className}>{children}</h1>;
}