import { Routes, Route, Navigate } from "react-router-dom";
import { AuthLayout } from "./components/AuthLayout";
import { MainLayout } from "./components/MainLayout";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Home } from "./pages/Home";
import { Calendar } from "./pages/Calendar";
import { Shopping } from "./pages/Shopping";
import { Account } from "./pages/Account";
import { CategoryRecipesPage } from "./pages/CategoryRecipesPage.tsx";
import { RecipeDetailPage } from "./pages/RecipeDetailPage.tsx";
import { CreateRecipePage } from "./pages/CreateRecipePage.tsx";
import { DraftRecipesPage } from "./pages/DraftRecipesPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route element={<MainLayout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/home/drafts" element={<DraftRecipesPage />} />
        <Route path="/home/categories/:categoryId" element={<CategoryRecipesPage />} />
        <Route path="/home/recipes/new" element={<CreateRecipePage />} />
        <Route path="/home/recipes/:recipeId" element={<RecipeDetailPage />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/shopping" element={<Shopping />} />
        <Route path="/account" element={<Account />} />
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
    </Routes>
  );
}

export default App;
