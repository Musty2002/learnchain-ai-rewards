import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet as WalletIcon, Send, Copy, Check, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

const Wallet = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [sendAmount, setSendAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await fetchWalletData();
    };
    checkAuth();
  }, [navigate]);

  const fetchWalletData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: walletData } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setWallet(walletData);

      if (walletData) {
        const { data: txData } = await supabase
          .from("transactions")
          .select("*, projects(title)")
          .eq("wallet_id", walletData.id)
          .order("created_at", { ascending: false });
        setTransactions(txData || []);
      }

      const { data: tokenData } = await supabase
        .from("token_info")
        .select("*")
        .eq("token_symbol", "LCT")
        .maybeSingle();
      setTokenInfo(tokenData);
    } catch (error) {
      toast.error("Failed to load wallet");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!sendAmount || !recipientAddress) {
      toast.error("Please fill in all fields");
      return;
    }

    const amount = parseInt(sendAmount);
    if (amount <= 0 || amount > (wallet?.balance || 0)) {
      toast.error("Invalid amount");
      return;
    }

    toast.info("Send feature coming soon! In production, this will transfer LCT on-chain.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
            LearnChain Wallet
          </h1>
          <p className="text-muted-foreground">Your on-chain LearnChain Token (LCT) wallet</p>
        </div>

        {/* Balance Card */}
        <Card className="shadow-reward mb-8 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 border-2 border-accent/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm text-muted-foreground">Total Balance</CardTitle>
                <div className="text-5xl font-bold bg-gradient-to-r from-accent via-primary to-secondary bg-clip-text text-transparent mt-2">
                  {wallet?.balance || 0}
                </div>
                <p className="text-lg font-semibold text-foreground mt-1">LearnChain Token (LCT)</p>
              </div>
              <WalletIcon className="w-16 h-16 text-accent/50" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-background/50 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-1">Contract Address</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono truncate">{tokenInfo?.contract_address || "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEd0"}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(tokenInfo?.contract_address || "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEd0")}
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-background/50 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-1">Network</p>
                <p className="text-sm font-semibold">Bitcoin-Lightening Network</p>
                <p className="text-xs text-accent">✓ LearnChain Token (LCT)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Send/Receive Tabs */}
        <Card className="shadow-elegant mb-8">
          <Tabs defaultValue="receive" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="receive" className="gap-2">
                <ArrowDownLeft className="w-4 h-4" />
                Receive
              </TabsTrigger>
              <TabsTrigger value="send" className="gap-2">
                <ArrowUpRight className="w-4 h-4" />
                Send
              </TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* Receive Tab */}
            <TabsContent value="receive" className="p-6">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">Receive LearnChain Token (LCT)</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Share your wallet address or QR code to receive LCT
                  </p>
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-6 bg-white rounded-lg border-4 border-primary">
                    <QRCodeSVG 
                      value={wallet?.wallet_address || ""}
                      size={200}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                </div>

                {/* Wallet Address */}
                <div className="space-y-2">
                  <Label>Your Wallet Address</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={wallet?.wallet_address || "Loading..."}
                      className="font-mono text-sm"
                    />
                    <Button
                      onClick={() => copyToClipboard(wallet?.wallet_address || "")}
                      variant="outline"
                      size="icon"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This is your unique LearnChain wallet address. Share it to receive LCT tokens.
                  </p>
                </div>

                {/* Token Info */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Token Symbol</p>
                    <p className="font-semibold">{tokenInfo?.token_symbol || "LCT"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Decimals</p>
                    <p className="font-semibold">{tokenInfo?.decimals || "18"}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Send Tab */}
            <TabsContent value="send" className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-2">Send LearnChain Token (LCT)</h3>
                  <p className="text-sm text-muted-foreground">
                    Transfer LCT to another wallet address
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Recipient Address</Label>
                    <Input
                      placeholder="LCT1234..."
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Amount (LCT)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      max={wallet?.balance || 0}
                    />
                    <p className="text-xs text-muted-foreground">
                      Available balance: {wallet?.balance || 0} LCT
                    </p>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Transaction Fee</span>
                      <span className="font-semibold">0 LCT</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-bold">{sendAmount || 0} LCT</span>
                    </div>
                  </div>

                  <Button 
                    onClick={handleSend} 
                    className="w-full gap-2"
                    size="lg"
                  >
                    <Send className="w-4 h-4" />
                    Send LCT
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="p-6">
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Transaction History</h3>
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <WalletIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>No transactions yet</p>
                    <p className="text-sm">Complete projects to earn LCT!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div 
                        key={tx.id} 
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.type === 'reward' ? 'bg-accent/20' : 'bg-muted'
                          }`}>
                            {tx.type === 'reward' ? (
                              <ArrowDownLeft className="w-5 h-5 text-accent" />
                            ) : (
                              <ArrowUpRight className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold capitalize">{tx.type}</h4>
                            <p className="text-sm text-muted-foreground">
                              {tx.projects?.title || tx.metadata?.quiz_title || 'System transaction'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            tx.type === 'reward' ? 'text-accent' : 'text-foreground'
                          }`}>
                            {tx.type === 'reward' ? '+' : '-'}{tx.amount} LCT
                          </p>
                          <p className="text-xs text-accent">✓ Confirmed</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
};

export default Wallet;
