import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { CheckCircle, XCircle, Clock, Eye, Users, BarChart3, Settings, Shield } from 'lucide-react';

export default function Admin() {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: pendingItems = [], isLoading } = useQuery({
    queryKey: ['/api/admin/items/pending'],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/items/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Item status updated',
        description: 'The item status has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/items/pending'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleApprove = (id: number) => {
    updateStatusMutation.mutate({ id, status: 'approved' });
  };

  const handleReject = (id: number) => {
    updateStatusMutation.mutate({ id, status: 'rejected' });
  };

  const getConditionColor = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'like new':
        return 'bg-green-100 text-green-800';
      case 'excellent':
        return 'bg-blue-100 text-blue-800';
      case 'good':
        return 'bg-yellow-100 text-yellow-800';
      case 'fair':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 rounded-full p-3">
                <Shield className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-indigo-100">Welcome back, {user?.firstName}!</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-indigo-100">Administrator</div>
              <div className="text-lg font-semibold">ReWear Platform</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fade-in">
          {/* Enhanced Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-l-4 border-l-orange-500 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-orange-600">{pendingItems.length}</div>
                    <div className="text-sm text-gray-600 font-medium">Pending Review</div>
                    <div className="text-xs text-gray-500">Requires immediate attention</div>
                  </div>
                  <div className="bg-orange-100 rounded-full p-3">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-green-500 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-green-600">3</div>
                    <div className="text-sm text-gray-600 font-medium">Approved Items</div>
                    <div className="text-xs text-gray-500">Live on platform</div>
                  </div>
                  <div className="bg-green-100 rounded-full p-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-blue-500 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-blue-600">3</div>
                    <div className="text-sm text-gray-600 font-medium">Active Users</div>
                    <div className="text-xs text-gray-500">Platform members</div>
                  </div>
                  <div className="bg-blue-100 rounded-full p-3">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Admin Tabs */}
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Items ({pendingItems.length})
              </TabsTrigger>
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Pending Items Tab */}
            <TabsContent value="pending">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    Items Pending Review
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {isLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Loading pending items...</p>
                    </div>
                  ) : pendingItems.length > 0 ? (
                    <div className="space-y-6">
                      {pendingItems.map((item: any) => (
                        <div key={item.id} className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* Image */}
                            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                              <img
                                src={item.images[0] || '/placeholder-image.jpg'}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {/* Details */}
                            <div className="md:col-span-2 space-y-3">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                                <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                              </div>
                              
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">{item.category}</Badge>
                                <Badge variant="outline">Size {item.size}</Badge>
                                <Badge className={getConditionColor(item.condition)}>
                                  {item.condition}
                                </Badge>
                                {item.brand && <Badge variant="outline">{item.brand}</Badge>}
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="font-medium">Points: {item.pointValue}</span>
                                <span>Listed: {new Date(item.createdAt).toLocaleDateString()}</span>
                              </div>
                              
                              {item.tags && item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {item.tags.map((tag: string, index: number) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3">
                              <Button
                                onClick={() => handleApprove(item.id)}
                                disabled={updateStatusMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                onClick={() => handleReject(item.id)}
                                disabled={updateStatusMutation.isPending}
                                variant="destructive"
                                className="shadow-sm"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="shadow-sm"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">No pending items to review</p>
                      <p className="text-sm">Great job! All items are up to date.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Platform Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Total Items</span>
                        <span className="text-2xl font-bold text-green-600">3</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Active Users</span>
                        <span className="text-2xl font-bold text-blue-600">3</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Completed Swaps</span>
                        <span className="text-2xl font-bold text-purple-600">0</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">3 items approved today</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm">New users registered</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-sm">Platform usage growing</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-blue-600" />
                    Admin Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-medium">Auto-approval for trusted users</h3>
                        <p className="text-sm text-gray-600">Automatically approve items from verified users</p>
                      </div>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-medium">Notification settings</h3>
                        <p className="text-sm text-gray-600">Manage admin notification preferences</p>
                      </div>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-medium">Platform analytics</h3>
                        <p className="text-sm text-gray-600">View detailed platform usage statistics</p>
                      </div>
                      <Button variant="outline" size="sm">View Analytics</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}