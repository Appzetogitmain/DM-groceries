import React from 'react';
import { HiOutlineClock, HiOutlineTrash, HiOutlineCheck } from 'react-icons/hi';

const PosHeldOrders = ({ heldCarts, onRestoreCart, onRemoveHeldCart }) => {
    if (!heldCarts || heldCarts.length === 0) {
        return null;
    }

    return (
        <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg mt-4 mb-2">
            <h4 className="text-sm font-semibold text-orange-800 flex items-center gap-1 mb-2">
                <HiOutlineClock size={16} /> Held Orders ({heldCarts.length})
            </h4>
            <div className="flex gap-2 overflow-x-auto pb-1">
                {heldCarts.map((cart, index) => (
                    <div key={cart.id} className="min-w-[200px] max-w-[250px] bg-white border border-orange-200 rounded p-2 flex flex-col gap-2 shrink-0 shadow-sm">
                        <div className="text-xs font-medium text-gray-700 flex justify-between">
                            <span>#{index + 1} - {cart.items.length} items</span>
                            <span className="text-gray-500">{new Date(cart.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                            {cart.customer ? cart.customer.name || cart.customer.phone : 'Walk-in'}
                        </div>
                        <div className="flex gap-1 mt-auto">
                            <button 
                                onClick={() => onRestoreCart(cart)}
                                className="flex-1 py-1 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 rounded flex items-center justify-center gap-1 transition-colors"
                            >
                                <HiOutlineCheck size={14} /> Restore
                            </button>
                            <button 
                                onClick={() => onRemoveHeldCart(cart.id)}
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="Discard"
                            >
                                <HiOutlineTrash size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PosHeldOrders;
