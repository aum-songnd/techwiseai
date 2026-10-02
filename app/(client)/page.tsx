import React from 'react';
import Container from '@/components/Container';
import HomeBanner from '@/components/HomeBanner';
import ProductGrid from '@/components/ProductGrid';
import HomeCategories from '@/components/HomeCategories';
import HomeBrands from '@/components/HomeBrands';
import HomeLatestBlog from '@/components/HomeLatestBlog';
import FlashSale from '@/components/FlashSale';

const Home = () => {
  return (
    <div>
      <Container>
         <HomeBanner />

        <HomeCategories/>
        <div className='py-5'>
            <ProductGrid />
        </div>
        <FlashSale/>
          <HomeBrands/>
        <HomeLatestBlog/>
      </Container>
    </div>
  );
}

export default Home;