import LoginCard from "@/components/auth/LoginCard";
import PageContainer from "@/components/layout/PageContainer";

export default function LoginPage() {
  return (
    <PageContainer className="relative w-full bg-[#020617] px-0">
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "#020617",
          backgroundImage: `
            linear-gradient(to right, rgba(71,85,105,0.18) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(71,85,105,0.18) 1px, transparent 1px),
            radial-gradient(circle at 50% 50%, rgba(139,92,246,0.15) 0%, transparent 70%)
          `,
          backgroundSize: "120px 120px, 120px 120px, 100% 100%",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 80% at 100% 0%, #000 50%, transparent 90%)",
          maskImage:
            "radial-gradient(ellipse 80% 80% at 100% 0%, #000 50%, transparent 90%)"
        }}
      />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <LoginCard />
        </div>
      </div>
    </PageContainer>
  );
}
