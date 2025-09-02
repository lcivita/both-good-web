import JigglyText from './components/JigglyText';
import GameImages from './components/GameImages';
import SocialIcons from './components/SocialIcons';

function App() {
  return (
    <>
      <header className="flex justify-center">
        <a href="/">
          <img 
            src="/imgs/BG logo.png" 
            alt="Both Good Logo"
            className="w-[250px]" 
            draggable="false"
          />
        </a>
      </header>
      
      <div className="max-w-[300px] h-auto mx-auto bg-black border-2 border-white relative overflow-visible">
        <main>

          {/* About */}
          <div className="nav-section">
            <JigglyText className="header-nav">About</JigglyText>
            <div className="w-[85%] mx-auto text-left font-8bit text-xl">
              <p>We're Both Good — an indie game studio from Brooklyn, NY.</p>
              <br />
              <p>We make competitive games with a party twist, and party games with a competitive edge.</p>
            </div>
          </div>
          

          {/* Games */}
          <div className="nav-section relative">
            <JigglyText className="header-nav">Games</JigglyText>
            <GameImages/>
          </div>

          {/* More coming soon */}
          <div className="w-[85%] mx-auto nav-section">
            <p className="mt-auto pb-5 text-center font-8bit">More coming very soon 👀</p>
          </div>
          
          {/* Socials */}
          <div className="w-[85%] mx-auto nav-section">
            <JigglyText className="header-nav">Socials</JigglyText>
            <SocialIcons />
          </div>
        </main>
      </div>
    </>
  );
}

export default App;