import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, HelpCircle, Mail, MessageCircle } from 'lucide-react';

const FAQ = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const faqData = [
    {
      id: '1',
      category: 'Sobre a Apostei',
      questions: [
        {
          question: 'Quem somos nós?',
          answer: 'A Apostei.org é o primeiro mercado de previsões do Brasil, permitindo que você se mantenha informado e lucre com seu conhecimento apostando em eventos futuros sobre diversos tópicos. Estudos mostram que os mercados de previsões costumam ser mais precisos do que os especialistas, pois combinam notícias, pesquisas e opiniões de especialistas em um único valor que representa a visão do mercado sobre as probabilidades de um evento. Nossos mercados refletem probabilidades precisas, imparciais e em tempo real para os eventos que mais importam para você. Os mercados buscam a verdade.'
        },
        {
          question: 'Como funciona?',
          answer: 'Ao contrário das casas de apostas, você não está apostando contra "a casa" – a contraparte de cada negociação é outro usuário do Apostei.org. Quanto maior o percentual de uma aposta, maior a chance dela ser a aposta vencedora e menores são os retornos. Já as opções de menor probabilidade, tem menores chances de serem as apostas vencedoras, mas possuem altíssimos retornos.'
        }
      ]
    },
    {
      id: '2',
      category: 'Conta e Perfil',
      questions: [
        {
          question: 'Como criar uma conta na Apostei?',
          answer: 'Para criar uma conta, clique em "Entrar" no canto superior direito e depois em "Criar conta". Preencha seus dados e confirme seu email.'
        },
        {
          question: 'Como redefinir minha senha?',
          answer: 'Na página de login, clique em "Esqueci minha senha" e siga as instruções enviadas para seu email.'
        },
        {
          question: 'Como atualizar meu perfil?',
          answer: 'Acesse "Configurações" no menu do seu perfil para atualizar suas informações pessoais e preferências.'
        }
      ]
    },
    {
      id: '3',
      category: 'Apostas e Mercados',
      questions: [
        {
          question: 'Como fazer uma aposta?',
          answer: 'Navegue pelos mercados disponíveis, selecione a opção desejada, insira o valor e confirme sua aposta. Certifique-se de ter saldo suficiente em sua carteira.'
        },
        {
          question: 'Posso cancelar uma aposta?',
          answer: 'Você pode encerrar sua aposta a qualquer momento. Será cobrada uma taxa de 10% sobre o valor total que foi apostado, para cobrir ajustes que devem ser realizados na Enquete afetada.'
        },
        {
          question: 'Como funcionam as odds?',
          answer: 'As odds representam a probabilidade de um resultado acontecer e determinam quanto você pode ganhar. Odds mais altas indicam menor probabilidade, mas maior retorno potencial.'
        },
        {
          question: 'Qual é o valor mínimo para apostar?',
          answer: 'O valor mínimo para apostas é de R$ 1,00.'
        }
      ]
    },
    {
      id: '4',
      category: 'Carteira e Pagamentos',
      questions: [
        {
          question: 'Como adicionar dinheiro à minha carteira?',
          answer: 'Acesse "Minhas apostas" > "Carteira" e escolha uma das opções de depósito disponíveis: cartão de crédito, PIX ou transferência bancária.'
        },
        {
          question: 'Como sacar meus ganhos?',
          answer: 'Vá para a seção de carteira e solicite um saque. Os saques são processados em até 2 dias úteis via PIX ou transferência bancária.'
        },
        {
          question: 'Há taxas para depósitos ou saques?',
          answer: 'Depósitos via PIX são gratuitos. Para outros métodos e saques, consulte nossa tabela de tarifas na seção de pagamentos.'
        },
        {
          question: 'Por que meu saque foi rejeitado?',
          answer: 'Saques podem ser rejeitados por: dados bancários incorretos, valor abaixo do mínimo (R$ 20) ou necessidade de verificação adicional da conta.'
        }
      ]
    },
    {
      id: '5',
      category: 'Segurança e Suporte',
      questions: [
        {
          question: 'A plataforma é segura?',
          answer: 'Sim, utilizamos criptografia de ponta e seguimos as melhores práticas de segurança para proteger seus dados e transações.'
        },
        {
          question: 'Como entrar em contato com o suporte?',
          answer: 'Você pode nos contactar através do chat ao vivo, email (suporte@apostei.org) ou através do formulário de contato em nosso site.'
        },
        {
          question: 'Como reportar um problema técnico?',
          answer: 'Entre em contato com nosso suporte técnico descrevendo detalhadamente o problema. Nossa equipe responderá em até 24 horas.'
        }
      ]
    }
  ];

  const filteredFAQ = faqData.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => 
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <HelpCircle className="h-8 w-8 text-primary mr-2" />
          <h1 className="text-3xl font-bold">Perguntas Frequentes</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Encontre respostas para as dúvidas mais comuns sobre a Apostei
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Pesquisar perguntas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* FAQ Content */}
      {filteredFAQ.length > 0 ? (
        <div className="space-y-6">
          {filteredFAQ.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="text-xl">{category.category}</CardTitle>
                <CardDescription>
                  {category.questions.length} pergunta{category.questions.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {category.questions.map((qa, index) => (
                    <AccordionItem key={index} value={`${category.id}-${index}`}>
                      <AccordionTrigger className="text-left">
                        {qa.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {qa.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma pergunta encontrada</h3>
            <p className="text-muted-foreground">
              Tente pesquisar com outras palavras ou entre em contato conosco.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Contact Section */}
      <Card className="mt-12">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageCircle className="h-5 w-5 mr-2" />
            Não encontrou sua resposta?
          </CardTitle>
          <CardDescription>
            Nossa equipe de suporte está pronta para ajudar você
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="outline" className="flex items-center">
              <Mail className="h-4 w-4 mr-2" />
              suporte@apostei.org
            </Button>
            <Button variant="outline" className="flex items-center">
              <MessageCircle className="h-4 w-4 mr-2" />
              Chat ao vivo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FAQ;