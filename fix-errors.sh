#!/bin/bash

echo "🔧 Fixing TypeScript errors for Next.js + Solana..."
echo ""

# Step 1: Delete unused Ethereum files
echo "📁 Step 1: Removing unused Ethereum files..."
rm -f src/App.tsx && echo "   ✅ Deleted src/App.tsx"
rm -f src/config/wagmi.ts && echo "   ✅ Deleted src/config/wagmi.ts"
rm -f src/contexts/Web3Provider.tsx && echo "   ✅ Deleted src/contexts/Web3Provider.tsx"
rm -f src/routes/index.tsx && echo "   ✅ Deleted src/routes/index.tsx"
echo ""

# Step 2: Generate IDL
echo "📦 Step 2: Setting up IDL..."
mkdir -p src/idl
if [ -f "target/idl/freelance_marketplace.json" ]; then
  cp target/idl/freelance_marketplace.json src/idl/
  echo "   ✅ Copied IDL file to src/idl/"
else
  echo "   ⚠️  Warning: IDL file not found."
  echo "   Run 'anchor build' first to generate it."
fi
echo ""

# Step 3: Check TypeScript errors
echo "🔍 Step 3: Checking TypeScript errors..."
npx tsc --noEmit 2>&1 | grep -c "error TS" > /tmp/ts-error-count.txt
ERROR_COUNT=$(cat /tmp/ts-error-count.txt)

echo "   Found $ERROR_COUNT TypeScript errors"
echo ""

# Step 4: Summary
echo "✅ Fix script completed!"
echo ""
echo "📝 Manual steps required:"
echo "   1. Update hook imports to use 'types/solana.ts'"
echo "   2. Add full IDL with account definitions to useSolanaProgram.ts"
echo "   3. Add state management (useState) to useJobs hook"
echo ""
echo "🧪 Test your fixes:"
echo "   npm run build"
echo ""
