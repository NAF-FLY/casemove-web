import LoginCard from "@/components/auth/LoginCard";
import PageContainer from "@/components/layout/PageContainer";

export default function LoginPage() {
  return (
    <PageContainer className="bg-[radial-gradient(circle_at_top,#202651_0%,#181D3E_55%,#11142C_100%)] px-0">
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <LoginCard />
        </div>
      </div>
    </PageContainer>
  );
}
