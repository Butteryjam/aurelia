import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://upzkcqovqstfsizerulx.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WZVvTluqoPHJiQurUxASWQ_8K6-3Pjb'

async function runLiveVerification() {
  console.log('=== Step 1: Real Supabase Authentication ===')
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: auth, error: authError } = await client.auth.signInWithPassword({
    email: 'user_a_test@recipevault.test',
    password: 'TestPassword123!',
  })

  if (authError || !auth.session?.access_token) {
    throw new Error('Supabase Auth failed: ' + authError?.message)
  }

  const token = auth.session.access_token
  const userId = auth.user.id
  console.log('✓ Successfully authenticated as:', auth.user.email, '(ID:', userId, ')')

  console.log('\n=== Step 2: Real AI Recipe Extraction (POST /api/ai/extract-text) ===')
  const sampleRecipeText = `
Classic Lemon Rosemary Roast Chicken
Prep time: 15 minutes
Cook time: 50 minutes
Servings: 4
Ingredients:
- 1 whole chicken (about 1.5 kg), patted dry
- 2 tablespoons extra virgin olive oil
- 2 sprigs fresh rosemary, finely chopped
- 3 cloves garlic, minced
- 1 organic lemon, halved
- 1 teaspoon sea salt
- 1/2 teaspoon freshly cracked black pepper

Instructions:
1. Preheat your oven to 200°C (400°F).
2. Rub the chicken exterior with olive oil, minced garlic, sea salt, pepper, and chopped rosemary.
3. Place the lemon halves inside the chicken cavity.
4. Roast in the preheated oven for 50 minutes until the skin is golden brown and internal temperature hits 75°C.
5. Rest for 10 minutes before carving.
`

  async function resilientPost(url, body) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (res.ok && !json.error) {
        return json
      }
      if (attempt < 3 && (res.status === 500 || res.status === 503 || json.error?.includes('Unable to process') || json.error?.includes('high demand'))) {
        console.warn(`  [Notice] Transient demand spike on ${url} (status ${res.status}). Waiting 3s before retry ${attempt + 1}...`)
        await new Promise((r) => setTimeout(r, 3000))
        continue
      }
      throw new Error(`Request to ${url} failed (${res.status}): ${json.error || res.statusText}`)
    }
  }

  const extractJson = await resilientPost('http://localhost:3000/api/ai/extract-text', { text: sampleRecipeText })
  console.log('✓ AI Recipe Extraction succeeded!')
  console.log('  Extracted Title:', extractJson.data.title)
  console.log('  Servings:', extractJson.data.servings)
  console.log('  Prep Time:', extractJson.data.prepTime, 'mins | Cook Time:', extractJson.data.cookTime, 'mins')
  console.log('  Ingredients count:', extractJson.data.ingredients?.length)
  console.log('  Instructions count:', extractJson.data.instructions?.length)

  console.log('\n=== Step 3: Real AI Chef Chat (POST /api/ai/chat) ===')
  const chatJson = await resilientPost('http://localhost:3000/api/ai/chat', {
    message: 'Hello Chef! What are 2 quick sides that pair wonderfully with roast lemon chicken?',
  })

  console.log('✓ AI Chef conversation succeeded!')
  console.log('  Conversation ID:', chatJson.data.conversationId)
  const assistantContent = chatJson.data.assistantMessage?.content || chatJson.data.message?.content || ''
  console.log('  Chef Response (first 180 chars):', assistantContent.slice(0, 180) + '...')

  console.log('\n=== Step 4: Real AI Recipe Modification (POST /api/ai/modify-recipe) ===')
  // First, find or create a test recipe in User A's vault
  const { data: existingRecipes } = await client
    .from('recipes')
    .select('id, title')
    .eq('user_id', userId)
    .limit(1)

  let testRecipeId = existingRecipes?.[0]?.id

  if (!testRecipeId) {
    const createRes = await fetch('http://localhost:3000/api/recipes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'Simple Garlic Butter Pasta',
        description: 'Quick evening pasta',
        servings: 2,
        prepTime: 5,
        cookTime: 12,
        ingredients: [
          { name: 'Spaghetti', quantity: '200', unit: 'g', isOptional: false },
          { name: 'Butter', quantity: '30', unit: 'g', isOptional: false },
          { name: 'Garlic', quantity: '2', unit: 'cloves', isOptional: false },
          { name: 'Parmesan', quantity: '40', unit: 'g', isOptional: false },
        ],
        instructions: [
          { stepNumber: 1, instruction: 'Boil spaghetti in salted water.' },
          { stepNumber: 2, instruction: 'Melt butter with garlic in a pan.' },
          { stepNumber: 3, instruction: 'Toss pasta with garlic butter and parmesan.' },
        ],
      }),
    })
    const createJson = await createRes.json()
    if (!createRes.ok || !createJson.data?.id) {
      throw new Error('Failed to create test recipe via API: ' + (createJson.error || createRes.statusText))
    }
    testRecipeId = createJson.data.id
  }

  // Record original recipe state to prove non-destructive guarantee
  const { data: originalBefore } = await client
    .from('recipes')
    .select('*')
    .eq('id', testRecipeId)
    .single()

  console.log('  Target Recipe for modification:', originalBefore.title, '(ID:', testRecipeId, ')')

  const modJson = await resilientPost('http://localhost:3000/api/ai/modify-recipe', {
    recipeId: testRecipeId,
    action: 'healthier',
    customInstruction: 'Make it gluten-free and higher in vegetables',
  })
  console.log('✓ AI Recipe Modification succeeded!')
  console.log('  Modified Recipe Title:', modJson.data.recipe?.title)
  console.log('  Summary of Changes:', modJson.data.summaryOfChanges)
  console.log('  Culinary Notes:', modJson.data.culinaryNotes?.slice(0, 100) + '...')

  // Step 5: Verify original recipe is completely UNCHANGED in Postgres
  const { data: originalAfter } = await client
    .from('recipes')
    .select('*')
    .eq('id', testRecipeId)
    .single()

  if (JSON.stringify(originalBefore) !== JSON.stringify(originalAfter)) {
    throw new Error('VIOLATION: Original recipe was modified in database!')
  }
  console.log('✓ VERIFIED: Original recipe was 100% UNCHANGED in the database (non-destructive guarantee confirmed).')

  console.log('\n=== ALL REAL AUTHENTICATED AI END-TO-END CALLS PASSED! ===')
}

runLiveVerification().catch((err) => {
  console.error('FAILED live verification:', err)
  process.exit(1)
})
