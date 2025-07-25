import { useState } from 'react';

export default function GameImages() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="flex flex-col gap-12 items-center mt-10">
      {/* Goo Goo Grapplers-*/}
      <div className="relative overflow-visible w-[375px] h-[200px]">
        <div>
          {/* Back Image - Positioned behind */}
          <img 
            src="/imgs/GGG_Bot.png" 
            alt="Back Image" 
            draggable="false"
            className={`absolute z-10 transition-transform duration-150 ease-in-out ${
              isHovered ? 'scale-105' : 'scale-100'
            }`}
          />
        </div>
        <div>
        {/* Front Image - Positioned on top */}
        <a 
          href="http://store.steampowered.com/app/3316660/Goo_Goo_Grapplers?utm_source=BGwebsite&utm_medium=gamethumbnail"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <img 
            src="/imgs/GGG_Top.png" 
            alt="Front Image" 
            draggable="false"
            className={`absolute z-20 transition-transform duration-150 ease-in-out ${
              isHovered ? 'scale-110' : 'scale-100'
            }`}
          />
        </a>
        </div>
      </div>
      
      {/* Placeholder for second game */}
      <div className="relative flex justify-center items-center overflow-visible h-[200px]">
        <div className="w-[375px] h-[200px] bg-gray-800 border-2 border-dashed border-gray-600 flex items-center justify-center rounded">
          <span className="text-gray-400 text-sm font-8bit text-3xl">Coming Soon</span>
        </div>
      </div>
    </div>
  );
}