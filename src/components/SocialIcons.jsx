export default function SocialIcons() {
  const socialLinks = [
    {
      href: "mailto:bothgood@bothgood.games",
      src: "/imgs/Mail_icon.png",
      alt: "email"
    },
    {
      href: "https://www.youtube.com/@BothGoodGames",
      src: "/imgs/YoutubeIcon.png",
      alt: "YouTube"
    },
    {
      href: "https://www.instagram.com/bothgoodgames/",
      src: "/imgs/igIgon.png",
      alt: "Instagram"
    },
    {
      href: "https://www.x.com/BothGoodGames",
      src: "/imgs/XIcon.png",
      alt: "Twitter"
    }
  ];

  return (
    <div className="flex justify-center gap-5 mt-5 mb-5">
      {socialLinks.map((link, index) => (
        <a key={index} href={link.href} className="no-underline">
          <img 
            src={link.src} 
            alt={link.alt}
            className="w-[35px] h-[35px] transition-transform duration-150 ease-in-out hover:scale-110"
          />
        </a>
      ))}
    </div>
  );
}