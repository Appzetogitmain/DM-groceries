import React, { useEffect, useState } from 'react';
import { onSosAlertTriggered, onSosAlertResolved } from '@core/services/orderSocket';
import { useAuth } from '@core/context/AuthContext';
import { adminApi } from '../services/adminApi';
import { toast } from 'sonner';
import { AlertTriangle, MapPin, Phone, User, CheckCircle } from 'lucide-react';
import Button from '@/shared/components/ui/Button';

const SOSListener = () => {
  const { token } = useAuth();
  const [activeAlerts, setActiveAlerts] = useState([]);

  // Fetch active alerts on mount
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await adminApi.getActiveSosAlerts();
        if (res.data.success) {
          setActiveAlerts(res.data.results || res.data.result || []);
        }
      } catch (err) {
        console.error("Failed to fetch SOS alerts", err);
      }
    };
    fetchAlerts();
  }, []);

  useEffect(() => {
    if (!token) return;

    const handleSosTriggered = (alert) => {
      toast.error(`SOS Triggered by ${alert.deliveryId?.name || 'Delivery Partner'}!`, {
        duration: 10000,
      });
      // Play a sound if you want here
      const audio = new Audio('/sos-alarm.mp3');
      audio.play().catch(e => console.log('Audio play failed', e));

      setActiveAlerts(prev => [alert, ...prev]);
    };

    const handleSosResolved = (resolvedAlert) => {
      setActiveAlerts(prev => prev.filter(a => a.id !== resolvedAlert.id && a._id !== resolvedAlert._id));
      toast.success("SOS Alert resolved.");
    };

    const unsubscribeTriggered = onSosAlertTriggered(token, handleSosTriggered);
    const unsubscribeResolved = onSosAlertResolved(token, handleSosResolved);

    return () => {
      unsubscribeTriggered();
      unsubscribeResolved();
    };
  }, [token]);

  const handleResolve = async (id) => {
    try {
      await adminApi.resolveSosAlert(id, { status: "resolved", notes: "Resolved from Admin UI" });
      setActiveAlerts(prev => prev.filter(a => a.id !== id && a._id !== id));
      toast.success("Alert resolved successfully");
    } catch (error) {
      toast.error("Failed to resolve alert");
    }
  };

  if (!activeAlerts || activeAlerts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white border-4 border-red-500 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-red-500 p-4 text-white rounded-t-xl flex items-center space-x-3">
          <AlertTriangle className="animate-ping" size={28} />
          <h2 className="text-xl font-black uppercase tracking-widest">SOS Emergency Alert</h2>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeAlerts.map(alert => (
            <div key={alert._id || alert.id} className="border border-red-200 bg-red-50 rounded-xl p-5 space-y-4 shadow-sm relative">
              <span className="absolute top-4 right-4 bg-red-500 text-white text-[10px] px-2 py-1 font-bold uppercase rounded-full animate-pulse">Active</span>
              
              {/* Delivery Partner Info */}
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center"><User size={14} className="mr-1"/> Partner Details</h3>
                <p className="text-lg font-black text-gray-900">{alert.deliveryId?.name}</p>
                <p className="text-gray-700 font-medium">Phone: {alert.deliveryId?.phone}</p>
                <p className="text-gray-700 font-medium">Vehicle: {alert.deliveryId?.vehicleNumber}</p>
              </div>

              {/* Location Info */}
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center"><MapPin size={14} className="mr-1"/> Last Location</h3>
                {alert.location?.coordinates ? (
                   <a 
                     href={`https://www.google.com/maps?q=${alert.location.coordinates[1]},${alert.location.coordinates[0]}`} 
                     target="_blank" 
                     rel="noreferrer"
                     className="inline-block bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-lg text-sm hover:bg-blue-200 transition"
                   >
                     Open in Google Maps
                   </a>
                ) : (
                  <p className="text-gray-500 italic">Location not available</p>
                )}
              </div>

              {/* Emergency Contacts */}
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Phone size={14} className="mr-1"/> Emergency Contacts</h3>
                {alert.emergencyContacts && alert.emergencyContacts.length > 0 ? (
                  <ul className="space-y-2">
                    {alert.emergencyContacts.map((contact, idx) => (
                      <li key={idx} className="bg-white p-3 rounded-lg border border-red-100 flex justify-between items-center">
                        <span className="font-bold text-gray-800">{contact.name}</span>
                        <a href={`tel:${contact.phone}`} className="text-blue-600 font-bold text-sm bg-blue-50 px-2 py-1 rounded-md">{contact.phone}</a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No emergency contacts listed.</p>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2">
                <Button 
                  onClick={() => handleResolve(alert._id || alert.id)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 uppercase tracking-wider text-sm flex items-center justify-center"
                >
                  <CheckCircle size={18} className="mr-2" /> Mark as Resolved
                </Button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default SOSListener;
