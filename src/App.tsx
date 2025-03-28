import React from 'react';
import { Layout, Header, Content, Footer } from './components/layout';
import Intro from './components/intro';
import Convertor from './components/convertor';
import Advantage from './components/advantage';
import Debugger from './components/debugger';
import useQueryString from './hooks/use-query-string';


const Index: React.FC = () => {
  return (
    <Layout>
      <Header />
      <Content>
        <Intro />
        <Convertor />
        <Advantage />
      </Content>
      <Footer />
    </Layout>
  );
}

const App: React.FC = () => {
  const qs = useQueryString<{ debugger?: string }>();
  
  return qs.debugger ? <Debugger /> : <Index />
};

export default App;
