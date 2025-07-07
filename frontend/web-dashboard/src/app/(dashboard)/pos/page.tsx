'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, TrashIcon, ShoppingCartIcon, ScanIcon } from 'lucide-react';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  barcode: string;
  stock: number;
}

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    // Get user role from cookies
    const role = document.cookie
      .split('; ')
      .find(row => row.startsWith('user_role='))
      ?.split('=')[1];
    setUserRole(role || '');
  }, []);

  const addProductByBarcode = async (barcode: string) => {
    if (!barcode.trim()) return;

    setIsLoading(true);
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwt_token='))
        ?.split('=')[1];

      const response = await fetch(`/api/v1/pos/products/${barcode}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Product not found');
      }

      const product = await response.json();
      
      // Check if we have enough stock
      const existingItem = cart.find(item => item.id === product.id);
      const currentQuantity = existingItem ? existingItem.quantity : 0;
      
      if (currentQuantity >= product.stock) {
        toast.error(`Insufficient stock. Available: ${product.stock}`);
        return;
      }
      
      setCart(prev => {
        const existingIndex = prev.findIndex(item => item.id === product.id);
        if (existingIndex > -1) {
          const newCart = [...prev];
          newCart[existingIndex].quantity += 1;
          return newCart;
        } else {
          return [...prev, {
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            barcode: product.barcode,
            stock: product.stock,
          }];
        }
      });

      setBarcodeInput('');
      toast.success(`${product.name} added to cart`);
    } catch (error) {
      toast.error('Product not found or error scanning');
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(id);
      return;
    }

    const item = cart.find(item => item.id === id);
    if (item && newQuantity > item.stock) {
      toast.error(`Insufficient stock. Available: ${item.stock}`);
      return;
    }
    
    setCart(prev => 
      prev.map(item => 
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const processSale = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setIsLoading(true);
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwt_token='))
        ?.split('=')[1];

      const saleData = {
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
        total: calculateTotal(),
      };

      const response = await fetch('/api/v1/pos/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(saleData),
      });

      if (!response.ok) {
        throw new Error('Error creating sale');
      }

      const result = await response.json();
      
      // Redirect to PayPal for payment
      window.location.href = result.approvalUrl;
      
    } catch (error) {
      toast.error('Error processing sale');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addProductByBarcode(barcodeInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      e.preventDefault();
      addProductByBarcode(barcodeInput);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Point of Sale</h1>
        <p className="text-gray-600">
          Scan products and process sales - Available for {userRole === 'manager' ? 'Managers' : 'Receptionists'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Product Scanner Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanIcon className="h-5 w-5" />
                Product Scanner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                <Input
                  placeholder="Scan or enter barcode..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                  autoFocus
                />
                <Button type="submit" disabled={isLoading || !barcodeInput.trim()}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </form>
              <p className="text-xs text-gray-500 mt-2">
                Tip: Use a barcode scanner or type the barcode manually
              </p>
            </CardContent>
          </Card>

          {/* Cart Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Cart Items</span>
                {cart.length > 0 && (
                  <Badge variant="secondary">{cart.length} items</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCartIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Cart is empty</p>
                  <p className="text-gray-400 text-sm">Scan a product to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                      <div className="flex-1">
                        <h3 className="font-medium text-lg">{item.name}</h3>
                        <p className="text-sm text-gray-500">Barcode: {item.barcode}</p>
                        <p className="text-xs text-gray-400">Stock available: {item.stock}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </Button>
                          <span className="w-12 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock}
                          >
                            +
                          </Button>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="text-sm">
                            ${item.price.toFixed(2)} each
                          </Badge>
                          <p className="text-lg font-bold">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cart Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No items in cart</p>
              ) : (
                <>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="truncate">{item.quantity}x {item.name}</span>
                        <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax (0%):</span>
                      <span>$0.00</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-xl">
                      <span>Total:</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
              
              <div className="space-y-3 pt-4">
                <Button 
                  onClick={processSale} 
                  disabled={cart.length === 0 || isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? 'Processing...' : `Charge $${calculateTotal().toFixed(2)}`}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  className="w-full"
                >
                  Clear Cart
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Session Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{cart.length}</p>
                  <p className="text-xs text-gray-500">Items</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{cart.reduce((sum, item) => sum + item.quantity, 0)}</p>
                  <p className="text-xs text-gray-500">Quantity</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
