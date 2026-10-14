import React from 'react';
import Container from '@/components/Container';
import HomeBanner from '@/components/HomeBanner';
import HomeCategories from '@/components/HomeCategories';
import HomeProductSections from '@/components/HomeProductSections';
import HomeLatestBlog from '@/components/HomeLatestBlog';

const Home = () => {
  return (
    <div>
      <Container>
         <HomeBanner />

        <HomeCategories/>
        <HomeProductSections />
        <HomeLatestBlog/>
      </Container>
    </div>
  );
}

export default Home;