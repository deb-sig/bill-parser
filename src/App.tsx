import React from 'react';
import { Layout, Header, Content, Footer } from './components/layout';
import Intro from './components/intro';
import Convertor from './components/convertor';
import Advantage from './components/advantage';


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

export default Index;
