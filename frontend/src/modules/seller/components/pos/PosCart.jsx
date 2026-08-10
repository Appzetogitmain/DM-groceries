import React from 'react';
import { HiOutlineTrash, HiPlus, HiMinus } from 'react-icons/hi';

const PosCart = ({ cart, updateQuantity, removeItem }) => {
    if (cart.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <div className="w-24 h-24 mb-4 rounded-full bg-gray-50 flex items-center justify-center">
                    <HiOutlineShoppingBag size={40} className="text-gray-300" />
                </div>
                <p className="text-lg font-medium text-gray-500">Cart is empty</p>
                <p className="text-sm">Scan barcode or click products to add</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto px-4 py-2">
            <div className="space-y-3">
                {cart.map((item) => (
                    <div key={item.productId} className="flex bg-white p-3 rounded-lg border border-gray-100 shadow-sm items-center gap-3">
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                                {item.name}
                            </h4>
                            <div className="text-sm text-gray-500 mt-0.5">
                                ₹{item.price} × {item.quantity}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200">
                                <button 
                                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                    className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors rounded-l-lg"
                                >
                                    <HiMinus size={16} />
                                </button>
                                <span className="w-8 text-center text-sm font-medium text-gray-900">
                                    {item.quantity}
                                </span>
                                <button 
                                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                    className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors rounded-r-lg"
                                >
                                    <HiPlus size={16} />
                                </button>
                            </div>
                            
                            <div className="text-right min-w-[70px]">
                                <div className="text-sm font-bold text-gray-900">
                                    ₹{(item.price * item.quantity).toFixed(2)}
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => removeItem(item.productId)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <HiOutlineTrash size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Need this import for empty state
import { HiOutlineShoppingBag } from 'react-icons/hi';

export default PosCart;
