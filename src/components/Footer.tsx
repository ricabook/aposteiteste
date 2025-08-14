import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const handleLinkClick = () => {
    // Scroll to top when navigating to a new page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const footerLinks = [
    { to: '/suporte', label: 'Suporte' },
    { to: '/privacidade', label: 'Privacidade' },
    { to: '/termos-de-uso', label: 'Termos de Uso' },
    { to: '/seguranca', label: 'Segurança' },
    { to: '/meios-de-pagamento', label: 'Meios de Pagamento' },
    { to: '/faq', label: 'Dúvidas' },
  ];

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          {/* Footer navigation links - left side on desktop, top on mobile */}
          <nav className="flex flex-wrap justify-center md:justify-start gap-3 sm:gap-6 md:gap-8">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={handleLinkClick}
                className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          
          {/* Copyright text - right side on desktop, bottom on mobile */}
          <div className="text-center md:text-right">
            <p className="text-xs sm:text-sm text-muted-foreground">
              © {currentYear}. Apostei.org - O primeiro site de mercado de previsões do Brasil.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;