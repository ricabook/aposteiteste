import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MeiosDePagamento = () => {
  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Métodos de Pagamento</h1>
          <p className="text-muted-foreground text-lg">
            Conheça todas as formas de pagamento aceitas na Apostei.org
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center">
                <img src="/lovable-uploads/fa0ad26e-322e-468a-8cb4-77a078b9ac61.png" alt="PIX" className="w-16 h-12 object-contain" />
              </CardTitle>
              <CardDescription>Transferência instantânea 24/7</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Tempo de processamento:</span>
                <Badge variant="secondary">Imediato</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Valor mínimo:</span>
                <span className="text-sm font-medium">R$ 10,00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Taxa:</span>
                <span className="text-sm font-medium text-green-600">Grátis</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center">
                <img src="/lovable-uploads/01450603-4f45-4bfb-b81d-f49d5a32d70f.png" alt="Banco do Brasil" className="w-16 h-12 object-contain" />
              </CardTitle>
              <CardDescription>Banco do Brasil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Tempo de processamento:</span>
                <Badge variant="outline">Até 1h</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Valor mínimo:</span>
                <span className="text-sm font-medium">R$ 10,00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Taxa:</span>
                <span className="text-sm font-medium text-green-600">Grátis</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center">
                <img src="/lovable-uploads/b1a4333e-a01d-4d2d-b2b1-d78a12dc1a94.png" alt="Caixa" className="w-16 h-12 object-contain" />
              </CardTitle>
              <CardDescription>Caixa Econômica Federal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Tempo de processamento:</span>
                <Badge variant="outline">Até 1h</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Valor mínimo:</span>
                <span className="text-sm font-medium">R$ 10,00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Taxa:</span>
                <span className="text-sm font-medium text-green-600">Grátis</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center">
                <img src="/lovable-uploads/dd8ad598-4c24-43c1-a32b-99dc0986db8b.png" alt="Itaú" className="w-16 h-12 object-contain" />
              </CardTitle>
              <CardDescription>Banco Itaú Unibanco</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Tempo de processamento:</span>
                <Badge variant="outline">Até 1h</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Valor mínimo:</span>
                <span className="text-sm font-medium">R$ 10,00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Taxa:</span>
                <span className="text-sm font-medium text-green-600">Grátis</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center">
                <img src="/lovable-uploads/8b7639a3-998d-447f-88c4-f61bea9b9624.png" alt="Santander" className="w-16 h-12 object-contain" />
              </CardTitle>
              <CardDescription>Banco Santander Brasil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Tempo de processamento:</span>
                <Badge variant="outline">Até 1h</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Valor mínimo:</span>
                <span className="text-sm font-medium">R$ 10,00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Taxa:</span>
                <span className="text-sm font-medium text-green-600">Grátis</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center">
                <img src="/lovable-uploads/da3177cd-c8fe-42d8-b2d2-a9b10fefb973.png" alt="Nubank" className="w-16 h-12 object-contain" />
              </CardTitle>
              <CardDescription>Nubank</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Tempo de processamento:</span>
                <Badge variant="outline">Até 1h</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Valor mínimo:</span>
                <span className="text-sm font-medium">R$ 10,00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Taxa:</span>
                <span className="text-sm font-medium text-green-600">Grátis</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tabela Comparativa de Métodos de Pagamento</CardTitle>
              <CardDescription>Compare os tempos e valores de cada método</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Método</TableHead>
                    <TableHead>Tempo de Processamento</TableHead>
                    <TableHead>Valor Mínimo Depósito</TableHead>
                    <TableHead>Valor Mínimo Saque</TableHead>
                    <TableHead>Taxa</TableHead>
                    <TableHead>Disponibilidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">PIX</TableCell>
                    <TableCell>Imediato</TableCell>
                    <TableCell>R$ 10,00</TableCell>
                    <TableCell>R$ 10,00</TableCell>
                    <TableCell className="text-green-600">Grátis</TableCell>
                    <TableCell>24/7</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Banco do Brasil</TableCell>
                    <TableCell>Até 1 hora</TableCell>
                    <TableCell>R$ 10,00</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="text-green-600">Grátis</TableCell>
                    <TableCell>Horário bancário</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Caixa</TableCell>
                    <TableCell>Até 1 hora</TableCell>
                    <TableCell>R$ 10,00</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="text-green-600">Grátis</TableCell>
                    <TableCell>Horário bancário</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Itaú</TableCell>
                    <TableCell>Até 1 hora</TableCell>
                    <TableCell>R$ 10,00</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="text-green-600">Grátis</TableCell>
                    <TableCell>Horário bancário</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Santander</TableCell>
                    <TableCell>Até 1 hora</TableCell>
                    <TableCell>R$ 10,00</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="text-green-600">Grátis</TableCell>
                    <TableCell>Horário bancário</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Nubank</TableCell>
                    <TableCell>Até 1 hora</TableCell>
                    <TableCell>R$ 10,00</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="text-green-600">Grátis</TableCell>
                    <TableCell>Horário bancário</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Como fazer um depósito na Apostei.org</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>Realizar um depósito na Apostei.org é um processo simples e seguro. Siga o passo a passo abaixo:</p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Acesse sua conta na plataforma Apostei.org</li>
                  <li>Clique no botão "Depósito" localizado no canto superior da tela</li>
                  <li>Escolha o método de pagamento de sua preferência</li>
                  <li>Insira o valor que deseja depositar (respeitando o valor mínimo)</li>
                  <li>Confirme a transação e siga as instruções na tela</li>
                  <li>Aguarde a confirmação do pagamento</li>
                </ol>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Como fazer um saque na Apostei.org</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>Atualmente, os saques são realizados exclusivamente via PIX para garantir maior segurança e rapidez:</p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Acesse "Minha Conta" em sua conta</li>
                  <li>Clique em "Saque" no menu</li>
                  <li>Selecione PIX como método de saque</li>
                  <li>Insira o valor desejado (mínimo de R$ 10,00)</li>
                  <li>Confirme a chave PIX cadastrada em seu CPF</li>
                  <li>Confirme a transação e aguarde o processamento</li>
                </ol>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Segurança nas Transações</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>A Apostei.org utiliza as mais avançadas tecnologias de segurança para proteger suas transações:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Criptografia SSL/TLS:</strong> Todos os dados são criptografados durante a transmissão</li>
                  <li><strong>Verificação de Identidade:</strong> Processo de verificação para garantir a autenticidade</li>
                  <li><strong>Monitoramento 24/7:</strong> Sistemas de monitoramento contínuo contra fraudes</li>
                  <li><strong>Conformidade Regulatória:</strong> Seguimos todas as normas bancárias brasileiras</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Perguntas Frequentes</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">A Apostei.org cobra taxas nas transações?</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Não, a Apostei.org não cobra nenhuma taxa sobre depósitos ou saques. Todas as transações são gratuitas para os usuários.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Quanto tempo demora para o dinheiro aparecer na minha conta?</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Depósitos via PIX são processados instantaneamente. Transferências bancárias podem levar até 1 hora para serem confirmadas.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Posso usar bancos digitais como Nubank?</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Sim! Através do PIX, você pode usar qualquer banco digital. Basta utilizar sua chave PIX para realizar depósitos e saques.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">É necessário verificar minha identidade?</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Por questões de segurança e conformidade, pode ser solicitada a verificação de identidade através de documento oficial e comprovante de residência.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">O que fazer se meu pagamento não foi processado?</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Entre em contato com nosso suporte através do chat ao vivo ou email. Nossa equipe está disponível para ajudar com qualquer problema em suas transações.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Contato e Suporte</h2>
              <p className="text-muted-foreground leading-relaxed">
                Para dúvidas sobre pagamentos ou problemas com transações, entre em contato conosco:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li><strong>Email:</strong> contato@apostei.org</li>
                <li><strong>Chat ao vivo:</strong> Disponível 24/7 na plataforma</li>
                <li><strong>Tempo de resposta:</strong> Até 2 horas em horário comercial</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeiosDePagamento;