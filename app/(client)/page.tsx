import React from 'react';
import Container from '@/components/Container';
import HomeBanner from '@/components/HomeBanner';
import ProductGrid from '@/components/ProductGrid';

const Home = () => {
  return (
    <div>
      <Container className="bg-shop-light-pink">
        <HomeBanner />
        <div className='py-10'>
            <ProductGrid />
        </div>
      
      </Container>
    </div>
  );
}

export default Home;