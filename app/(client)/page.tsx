import React from 'react';
import Container from '@/components/Container';
import HomeBanner from '@/components/HomeBanner';
import ProductGrid from '@/components/ProductGrid';
import HomeCategories from '@/components/HomeCategories';

const Home = () => {
  return (
    <div>
      <Container className="bg-shop-light-pink">
        <HomeBanner />
        <div className='py-5'>
            <ProductGrid />
        </div>
        <HomeCategories/>
      </Container>
    </div>
  );
}

export default Home;