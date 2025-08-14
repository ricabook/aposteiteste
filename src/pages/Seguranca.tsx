const Seguranca = () => {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Segurança</h1>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Segurança e uso da sua informação</h2>
            <p className="text-muted-foreground leading-relaxed">
              A segurança e a privacidade dos seus dados pessoais e informações de conta são a nossa maior prioridade; como você verá abaixo, todas as medidas necessárias e os métodos mais avançados são aplicados para protegê-los. Gostaríamos que você soubesse que as suas informações pessoais não serão usadas em nenhum momento para fins diferentes dos necessários para o bom funcionamento do site, dos produtos e serviços que fornecemos. Qualquer acesso a essa mesma informação pela nossa parte é totalmente auditado e sempre feito exclusivamente por pessoal autorizado.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Segurança e acesso à sua conta</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>Além das ações que já implementamos para proteger a sua conta, há uma série de etapas que você pode seguir para tornar a sua experiência de jogo ainda mais segura:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Proteja seu nome de usuário e senha e não os revele a ninguém.</li>
                <li>Use uma senha forte que contenha letras, símbolos e números.</li>
                <li>Altere sua senha com frequência, clicando em "Perfil" e depois em "Segurança da Conta" em Minha Conta.</li>
                <li>Faça logout de sua conta depois de concluir sua atividade de jogo.</li>
                <li>Seja ainda mais cuidadoso com os itens acima ao usar um dispositivo eletrônico compartilhado.</li>
                <li>Se a conta de mídia social que você vinculou à sua conta em nossa plataforma tiver sido comprometida, desconecte-a imediatamente escolhendo "Perfil" e depois "Segurança da Conta" em Minha Conta.</li>
                <li>Visite regularmente o "Histórico" em Minha Conta para verificar as Apostas, Transações e P&L de Apostas feitas com seu dispositivo.</li>
              </ul>
              <p className="mt-3">Não hesite em entrar em contato com nosso Suporte ao Cliente para obter assistência em qualquer um dos casos mencionados acima, e visite também https://cartilha.cert.br ou www.getsafeonline.org para obter mais informações sobre segurança na Internet.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Conformidade com a segurança</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nossa empresa verifica regularmente a operação adequada dos mecanismos de segurança e aplica os principais padrões internacionais de segurança, como ISO/IEC 27001:2022 (Sistema de Gerenciamento de Segurança da Informação) e PCI DSS (Padrão de Segurança de Dados do Setor de Cartões de Pagamento), que validam as práticas recomendadas que adotamos para garantir a confidencialidade, a integridade e a disponibilidade dos dados de nossos clientes. Além disso, como um serviço comercial, somos auditados anualmente quanto à implementação da ISO/IEC 27001 (Sistema de Gerenciamento de Segurança da Informação) e estão sujeitas a uma avaliação anual por um QSA (Qualified Security Assessor) certificado, bem como a varreduras periódicas de vulnerabilidade.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Privacidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              Como uma empresa de apostas e jogos de azar, somos obrigados a coletar informações pessoais durante o processo de registro, a fim de fornecer nossos serviços em conformidade com as disposições legais e regulamentares. Sempre que um usuário se registra, se conecta, faz pagamentos ou envia informações confidenciais, usamos o padrão SSL / TLS que criptografa os dados do usuário antes de serem enviados do computador do usuário para serem descriptografados apenas pelos servidores da Apostei. Da mesma forma, as páginas da Web que o usuário navega são criptografadas pelos servidores da Apostei, de modo que só podem ser descriptografadas pelo usuário do computador. Indicativamente, navegadores como Chrome, Firefox ou Opera usam a criptografia AES-256 bits, enquanto nossos servidores não aceitarão nenhuma conexão de navegador que não atenda ao requisito mínimo de segurança de uma criptografia de 128 bits. A segurança das páginas da Web pode ser verificada pela presença do símbolo do cadeado no navegador, enquanto os usuários do Internet Explorer podem clicar com o botão direito do mouse na opção Propriedades e confirmar o uso do protocolo TLS adequadamente.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Transparência</h2>
            <p className="text-muted-foreground leading-relaxed">
              Se você acredita que identificou uma possível vulnerabilidade de segurança em qualquer uma de nossas páginas, serviços/produtos, aplicativos ou APIs, envie um breve resumo do problema para security@apostei.org juntamente com o e-mail para o qual poderemos entrar em contato para obter mais informações.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Seguranca;