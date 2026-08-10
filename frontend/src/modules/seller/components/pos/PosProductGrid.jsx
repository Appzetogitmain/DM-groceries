import React, { useState, useEffect } from 'react';
import { HiOutlineSearch, HiOutlineViewGrid, HiOutlineShoppingBag } from 'react-icons/hi';
import { posApi } from '../../services/posApi';
import { toast } from 'sonner';

const PosProductGrid = ({ onAddToCart }) => {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const res = await posApi.searchProducts({ search, limit: 20 });
                if (res.data?.success) {
                    setProducts(res.data.results);
                }
            } catch (error) {
                toast.error('Failed to fetch products');
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchProducts, 300);
        return () => clearTimeout(timer);
    }, [search]);

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200">
                <div className="relative">
                    <HiOutlineSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search products by name or barcode (F2)..."
                        className="w-full pl-10 pr-4 py-3 bg-gray-100 border-transparent rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <HiOutlineShoppingBag size={48} className="mb-4 opacity-50" />
                        <p className="text-lg">No products found</p>
                        <p className="text-sm">Try scanning a different barcode or typing a name</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {products.map((product) => (
                            <div
                                key={product._id}
                                onClick={() => product.stock > 0 && onAddToCart(product)}
                                className={`pos-product-card relative flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-blue-500 hover:shadow-md transition-all cursor-pointer ${
                                    product.stock <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''
                                }`}
                            >
                                <div className="aspect-square w-full bg-gray-50 relative p-2 flex items-center justify-center">
                                    {product.mainImage ? (
                                        <img
                                            src={product.mainImage}
                                            alt={product.name}
                                            className="w-full h-full object-contain mix-blend-multiply"
                                        />
                                    ) : (
                                        <HiOutlineViewGrid className="text-gray-300 w-12 h-12" />
                                    )}
                                    {product.stock <= 0 && (
                                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                            <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-medium">
                                                Out of Stock
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 flex flex-col flex-1 justify-between">
                                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">
                                        {product.name}
                                    </h3>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-lg font-bold text-gray-900">
                                            ₹{product.salePrice || product.price}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            Stock: {product.stock}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PosProductGrid;
