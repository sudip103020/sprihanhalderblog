import Hero from "../components/Home/Hero";
import Welcome from "../components/Home/Welcome";
import MemoriesPreview from "../components/Home/MemoriesPreview";
import MilestonePreview from "../components/Home/MilestonePreview";

const Home = () => {
  return (
    <>
      <Hero />
      <Welcome />
      <MemoriesPreview />
      <MilestonePreview />
    </>
  );
};

export default Home;