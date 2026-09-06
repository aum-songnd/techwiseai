import React from 'react';
import Container from '@/components/Container';
import HomeBanner from '@/components/HomeBanner';
import ProductGrid from '@/components/ProductGrid';
import HomeCategories from '@/components/HomeCategories';
import HomeBrands from '@/components/HomeBrands';
import HomeLatestBlog from '@/components/HomeLatestBlog';

const Home = () => {
  return (
    <div>
      <Container className="bg-shop-light-pink">
        <HomeBanner />
        <div className='py-5'>
            <ProductGrid />
        </div>
        <HomeCategories/>
        <HomeBrands/>
        <HomeLatestBlog/>
      </Container>
    </div>
  );
}

export default Home;