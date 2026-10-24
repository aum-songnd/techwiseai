import React from 'react';
import Container from "@/components/common/Container";
import HomeBanner from "@/components/home/HomeBanner";
import HomeCategories from "@/components/home/HomeCategories";
import HomeProductSections from "@/components/home/HomeProductSections";
import HomeLatestBlog from "@/components/home/HomeLatestBlog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const Home = () => {
  return (
    <div className="font-sans min-h-screen bg-white text-neutral-900">
      <Container>
        <HomeBanner />
        <HomeCategories />
        <HomeProductSections />
        <HomeLatestBlog />
      </Container>
    </div>
  );
};

export default Home;