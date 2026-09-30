import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { About } from "./components/About";
import { Skills } from "./components/Skills";
import { Projects } from "./components/Projects";
import { Experience } from "./components/Experience";
import { Achievements } from "./components/Achievements";
import { CurrentlyExploring } from "./components/CurrentlyExploring";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";
import { CursorGlow } from "./components/CursorGlow";

export default function App() {
  return (
    <>
      <div className="grain" />
      <CursorGlow />
      <Navbar />
      <main>
        <Hero />
        <About />
        <Skills />
        <Projects />
        <Experience />
        <Achievements />
        <CurrentlyExploring />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
