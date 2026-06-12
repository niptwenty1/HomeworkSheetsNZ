"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ArrowRight, Home } from "lucide-react";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  type: "firework" | "star";
}

function CelebrateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const particleIdRef = useRef(0);

  const studentName = searchParams.get("name") || "Student";
  const completionDate =
    searchParams.get("date") ||
    new Date().toLocaleDateString("en-NZ");

  // Create firework burst
  const createFireworks = (x: number, y: number) => {
    const newParticles: Particle[] = [];
    const burstCount = 30;

    for (let i = 0; i < burstCount; i++) {
      const angle = (i / burstCount) * Math.PI * 2;
      const speed = 4 + Math.random() * 4;

      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        type: "firework",
      });
    }

    particlesRef.current.push(...newParticles);
  };

  // Create floating stars
  const createStars = (x: number, y: number) => {
    const newParticles: Particle[] = [];
    const starCount = 8;

    for (let i = 0; i < starCount; i++) {
      const angle = (i / starCount) * Math.PI * 2;
      const speed = 2 + Math.random() * 2;

      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        type: "star",
      });
    }

    particlesRef.current.push(...newParticles);
  };

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationId: number;

    const animate = () => {
      // Clear canvas
      ctx.fillStyle = "rgba(247, 239, 224, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter((particle) => {
        particle.life -= 0.015;

        if (particle.life <= 0) {
          return false;
        }

        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.15; // gravity

        // Draw particle
        const opacity = particle.life;

        if (particle.type === "firework") {
          ctx.fillStyle = `rgba(${Math.random() > 0.5 ? "238, 163, 140" : "169, 216, 208"}, ${opacity})`;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Star
          ctx.fillStyle = `rgba(245, 198, 102, ${opacity})`;
          ctx.font = "bold 20px Arial";
          ctx.fillText("★", particle.x, particle.y);
        }

        return true;
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Trigger celebrations on mount and when clicking
  useEffect(() => {
    const triggerCelebration = () => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      createFireworks(centerX, centerY);
      createStars(centerX - 100, centerY - 100);
      createStars(centerX + 100, centerY - 100);
      createFireworks(centerX - 150, centerY + 100);
      createFireworks(centerX + 150, centerY + 100);
    };

    // Initial celebration
    triggerCelebration();

    // Repeat every 2 seconds
    const interval = setInterval(triggerCelebration, 2000);

    return () => clearInterval(interval);
  }, [createFireworks, createStars]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    createFireworks(e.clientX, e.clientY);
    createStars(e.clientX, e.clientY);
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background gradients */}
      <div className="pointer-events-none absolute left-[-4rem] top-28 h-44 w-44 rounded-full bg-[#eea38c]/28 blur-3xl" />
      <div className="pointer-events-none absolute right-[-5rem] top-[34rem] h-48 w-48 rounded-full bg-[#a9d8d0]/45 blur-3xl" />

      {/* Canvas for animations */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 cursor-pointer"
        onClick={handleCanvasClick}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        <div className="text-center">
          {/* Celebration emoji */}
          <div className="mb-8 animate-bounce">
            <span className="text-8xl">🎉</span>
          </div>

          {/* Main message */}
          <h1 className="mb-4 text-5xl font-black leading-tight tracking-tight text-[#2a2722] sm:text-6xl lg:text-7xl">
            Fantastic work,{" "}
            <span className="bg-gradient-to-r from-[#eea38c] to-[#a9d8d0] bg-clip-text text-transparent">
              {studentName}
            </span>
            !
          </h1>

          {/* Subheading */}
          <p className="mb-8 text-xl font-bold text-[#6d6255] sm:text-2xl">
            You&apos;ve completed your homework
          </p>

          {/* Completion details */}
          <div className="tactile-panel mx-auto mb-8 inline-block rounded-[2rem] px-8 py-6">
            <p className="text-lg font-semibold text-[#6d6255]">
              Completed on{" "}
              <span className="font-black text-[#2a2722]">{completionDate}</span>
            </p>
          </div>

          {/* Achievement message */}
          <div className="mx-auto mb-12 max-w-2xl space-y-4 text-lg font-medium leading-8 text-[#6d6255]">
            <p>
              You&apos;ve shown dedication and commitment to your learning. Keep up the amazing progress!
            </p>
            <p className="text-base">
             Carry on with teh effort.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <button
              onClick={() => router.push("/")}
              className="tactile-button inline-flex min-h-14 items-center justify-center gap-2 rounded-[1.35rem] bg-[#eea38c] px-8 pb-4 pt-3 text-base font-black text-[#2a2722] transition"
            >
              <Home className="h-5 w-5" />
              Back to Home
            </button>
            <button
              onClick={() => router.push("/")}
              className="tactile-button tactile-button-mint inline-flex min-h-14 items-center justify-center gap-2 rounded-[1.35rem] bg-[#a9d8d0] px-8 pb-4 pt-3 text-base font-black text-[#2a2722] transition"
            >
              More Worksheets
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          {/* Click instruction */}
          <p className="mt-12 text-sm font-semibold text-[#8d7c6b]">
            ✨ Click anywhere to create more fireworks! ✨
          </p>
        </div>
      </div>
    </main>
  );
}

export default function CelebratePage() {
  return (
    <CelebrateContent />
  );
}
