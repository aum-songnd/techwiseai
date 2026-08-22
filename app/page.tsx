import React from 'react';
import Container from '@/components/Container';
import HomeBanner from '@/components/HomeBanner';

const Home = () => {
  return (
    <div>
      <Container className="bg-shop-light-pink">
        <HomeBanner />
      </Container>
    </div>
  );
}

export default Home;