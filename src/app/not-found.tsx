import { MainLayout } from "@/components/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              404 - ページが見つかりません
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            <div className="text-9xl font-bold text-muted-foreground">404</div>
            <p className="text-center text-lg text-muted-foreground">
              お探しのページは存在しないか、移動した可能性があります。
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
