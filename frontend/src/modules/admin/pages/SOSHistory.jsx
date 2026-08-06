import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/adminApi';
import { toast } from 'sonner';
import { ShieldAlert, MapPin, User, CheckCircle, Search } from 'lucide-react';
import Card from '@/shared/components/ui/Card';

const SOSHistory = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await adminApi.getResolvedSosAlerts();
        if (res.data.success) {
          setAlerts(res.data.results || res.data.result || []);
        }
      } catch (error) {
        toast.error("Failed to load SOS history");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filteredAlerts = alerts.filter(alert => 
    alert.deliveryId?.name?.toLowerCase().includes(search.toLowerCase()) ||
    alert.deliveryId?.phone?.includes(search)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ShieldAlert className="mr-2 text-red-500" />
            SOS Alert History
          </h1>
          <p className="text-gray-500 mt-1">View previously resolved delivery emergencies</p>
        </div>
        
        <div className="mt-4 md:mt-0 relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search name or phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <ShieldAlert size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No SOS History</h3>
          <p className="text-gray-500">No resolved emergency alerts were found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAlerts.map((alert) => (
            <Card key={alert._id || alert.id} className="p-5 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-3 flex flex-col items-end">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle size={12} className="mr-1" />
                  {alert.status.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  {new Date(alert.resolvedAt).toLocaleString()}
                </span>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-red-50 p-3 rounded-full">
                  <ShieldAlert className="text-red-500" size={24} />
                </div>
                <div className="flex-1 min-w-0 pr-16">
                  <h3 className="text-lg font-bold text-gray-900 truncate">
                    {alert.deliveryId?.name || "Unknown Partner"}
                  </h3>
                  <p className="text-sm text-gray-500 flex items-center mt-1">
                    <User size={14} className="mr-1" /> {alert.deliveryId?.phone}
                  </p>
                  
                  <div className="mt-4 space-y-2">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-semibold">Resolved By</p>
                      <p className="text-sm text-gray-900">{alert.resolvedBy?.name || "Unknown Admin"}</p>
                    </div>

                    {alert.notes && (
                      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                        <p className="text-xs text-yellow-800 uppercase font-semibold">Resolution Notes</p>
                        <p className="text-sm text-yellow-900 italic">"{alert.notes}"</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <a 
                      href={`https://www.google.com/maps?q=${alert.location?.coordinates[1]},${alert.location?.coordinates[0]}`}
                      target="_blank"
                      rel="noreferrer" 
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                    >
                      <MapPin size={16} className="mr-1" /> View Incident Location on Map
                    </a>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SOSHistory;
