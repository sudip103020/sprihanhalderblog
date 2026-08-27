import Hero from "../components/Home/Hero";
import FamilyPreview from "../components/Home/FamilyPreview";
import MemoriesPreview from "../components/Home/MemoriesPreview";
import MilestonePreview from "../components/Home/MilestonePreview";
import BlogPreview from "../components/Home/BlogPreview";

const Home = () => {
  return (
    <>
      <Hero />

      <FamilyPreview />

      <MemoriesPreview />

      <BlogPreview />

      <MilestonePreview />
    </>
  );
};

export default Home;