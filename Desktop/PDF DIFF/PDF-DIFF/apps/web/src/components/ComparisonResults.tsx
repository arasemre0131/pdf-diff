import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  BarChart3,
  Info
} from 'lucide-react';

interface ComparisonResultsProps {
  results: any;
}

export function ComparisonResults({ results }: ComparisonResultsProps) {
  const getSimilarityColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSimilarityBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-600">High Similarity</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-600">Medium Similarity</Badge>;
    return <Badge className="bg-red-600">Low Similarity</Badge>;
  };

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Comparison Results
            </CardTitle>
            <CardDescription>
              Detailed analysis of differences between the two documents
            </CardDescription>
          </div>
          {results.success !== false && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            {/* Similarity Score */}
            {results.similarity_score !== undefined && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Similarity Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className={`text-5xl mb-2 ${getSimilarityColor(results.similarity_score)}`}>
                      {results.similarity_score}%
                    </div>
                    <div className="flex justify-center">
                      {getSimilarityBadge(results.similarity_score)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Key Metrics */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.total_pages && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                      <div className="text-slate-900 mb-1">{results.total_pages}</div>
                      <div className="text-slate-600">Total Pages</div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {results.differences_count !== undefined && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                      <div className="text-slate-900 mb-1">{results.differences_count}</div>
                      <div className="text-slate-600">Differences Found</div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {results.identical !== undefined && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      {results.identical ? (
                        <>
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600" />
                          <div className="text-slate-900 mb-1">Identical</div>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                          <div className="text-slate-900 mb-1">Different</div>
                        </>
                      )}
                      <div className="text-slate-600">Document Status</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Message */}
            {results.message && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>{results.message}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            {results.differences && Array.isArray(results.differences) && results.differences.length > 0 ? (
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                <div className="space-y-3">
                  {results.differences.map((diff: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
                          <div className="flex-1">
                            <div className="text-slate-700 mb-2">
                              Difference #{index + 1}
                            </div>
                            {diff.page && (
                              <Badge variant="outline" className="mb-2">
                                Page {diff.page}
                              </Badge>
                            )}
                            {diff.type && (
                              <div className="mb-1">
                                <span className="text-slate-600">Type: </span>
                                <span className="text-slate-900">{diff.type}</span>
                              </div>
                            )}
                            {diff.description && (
                              <div className="text-slate-600">{diff.description}</div>
                            )}
                            {typeof diff === 'string' && (
                              <div className="text-slate-600">{diff}</div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>No Differences Found</AlertTitle>
                <AlertDescription>
                  The documents appear to be identical or no detailed differences are available.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Raw Data Tab */}
          <TabsContent value="raw">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Raw JSON Response</CardTitle>
                <CardDescription>
                  Complete response data from the comparison API
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] w-full">
                  <pre className="text-sm bg-slate-50 p-4 rounded-md overflow-x-auto">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
