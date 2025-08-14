const Privacidade = () => {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade da Apostei.org</h1>
          <p className="text-muted-foreground text-lg">
            Como tratamos e protegemos suas informações pessoais
          </p>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Introdução</h2>
            <p className="text-muted-foreground leading-relaxed">
              A Apostei.org ("nós", "nossa empresa", "nosso site") está comprometida com a proteção da sua privacidade. Esta Política de Privacidade explica como coletamos, usamos, armazenamos e compartilhamos seus dados pessoais quando você acessa ou utiliza nossos serviços. Ao utilizar nosso site, você concorda com os termos aqui descritos.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Dados que coletamos</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p><strong>Automáticos:</strong> endereço IP, tipo de navegador, comportamento de navegação, duração da sessão, localização aproximada e logs de acesso.</p>
              <p><strong>Fornecidos por você:</strong> nome, e-mail, data de nascimento, endereço, informações financeiras (quando necessário), entre outros.</p>
              <p><strong>Cookies e rastreamento:</strong> usamos cookies e tecnologias similares para melhorar sua experiência, personalizar conteúdos e analisar nosso desempenho.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Como usamos suas informações</h2>
            <div className="text-muted-foreground leading-relaxed">
              <p>Os dados são utilizados para:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Criar e gerenciar sua conta e proporcionar acesso aos serviços.</li>
                <li>Verificar sua identidade e cumprir requisitos legais ou regulatórios.</li>
                <li>Personalizar sua experiência e enviar comunicações relevantes sobre produtos, promoções ou serviços, sempre com seu consentimento.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Compartilhamento de dados</h2>
            <div className="text-muted-foreground leading-relaxed">
              <p>Não vendemos nem divulgamos seus dados pessoais para terceiros com fins comerciais. Compartilhamos suas informações somente quando:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Há requisitos legais ou solicitações judiciais.</li>
                <li>É necessário para manutenção, segurança e execução de serviços por nossos prestadores contratados.</li>
                <li>Existe transferência de ativos, sempre com salvaguardas contratuais adequadas.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Cookies e rastreamento</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos cookies para autenticação, personalização e comportamento do usuário. Você pode configurar seu navegador para bloquear cookies, mas isso pode afetar funcionalidades do site.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Segurança</h2>
            <p className="text-muted-foreground leading-relaxed">
              Adotamos medidas técnicas e administrativas, como criptografia e controles de acesso, para proteger seus dados contra acesso não autorizado, alteração, perda ou divulgação.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Retenção de dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Guardamos seus dados apenas pelo tempo necessário para cumprir finalidades legítimas ou obrigações legais. Após isso, eles são descartados com segurança.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Seus direitos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Você tem o direito de solicitar: acesso, correção, exclusão, portabilidade, restrição, oposição ao uso ou revogação de consentimento. Os pedidos devem ser respondidos em até 30 dias. Você também pode registrar uma reclamação junto à Autoridade Nacional de Proteção de Dados (ANPD).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Atualizações dessa política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta Política de Privacidade. Publicaremos a nova versão em nosso site com indicação da data da última revisão. Recomendamos revisitá-la periodicamente.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">10. Contato</h2>
            <div className="text-muted-foreground leading-relaxed">
              <p>Para dúvidas ou solicitações sobre privacidade, entre em contato através de:</p>
              <p className="mt-2"><strong>E-mail:</strong> privacidade@apostei.org</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacidade;