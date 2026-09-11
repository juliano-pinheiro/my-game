# 🚀 Como Publicar o Flying Bird no GitHub Pages

Este guia ensina como colocar o jogo online gratuitamente no **GitHub Pages** para compartilhar o link com qualquer pessoa!

---

## 📋 Passo 1: Criar o Repositório no GitHub

1. Acesse sua conta no [GitHub](https://github.com/) e clique no botão **New** (ou acesse [github.com/new](https://github.com/new)).
2. Dê um nome para o repositório, por exemplo: `flying-bird` (ou o nome que preferir).
3. Deixe o repositório marcado como **Public** (Público).
4. **Não** marque opções como "Add README" ou ".gitignore" (já preparamos tudo localmente).
5. Clique em **Create repository**.

---

## 💻 Passo 2: Enviar os Arquivos para o GitHub

Abra o terminal (PowerShell) na pasta do jogo (`c:\Users\jotaz\Desktop\projetcs\game`) e execute os seguintes comandos:

```bash
# 1. Adicionar todos os arquivos
git add .

# 2. Criar o primeiro commit
git commit -m "feat: Flying Bird game ready for GitHub Pages"

# 3. Vincular com o seu repositório do GitHub (troque <seu-usuario> e <seu-repositorio>)
git remote add origin https://github.com/<seu-usuario>/<seu-repositorio>.git

# 4. Enviar os arquivos para a branch main
git push -u origin main
```

*(Substitua `<seu-usuario>` pelo seu nome de usuário do GitHub e `<seu-repositorio>` pelo nome do repositório criado).*

---

## 🌐 Passo 3: Ativar o GitHub Pages

Após enviar o código para o GitHub:

1. No seu repositório no GitHub, clique na aba **Settings** (Configurações) no topo.
2. No menu lateral esquerdo, clique em **Pages** (dentro da seção *Code and automation*).
3. Na seção **Build and deployment**:
   * **Opção A (Deploy via Branch - Mais comum):**
     * Em **Source**, selecione `Deploy from a branch`.
     * Em **Branch**, selecione `main` e a pasta `/ (root)` ou `/docs`.
     * Clique em **Save**.
   * **Opção B (Deploy via GitHub Actions):**
     * Em **Source**, selecione `GitHub Actions`. O workflow automático que criamos fará o deploy automaticamente a cada `git push`!

---

## 🎮 Passo 4: Jogar Online!

Em cerca de 1 a 2 minutos, o GitHub publicará o seu site!

O link do seu jogo ficará disponível em:
```text
https://<seu-usuario>.github.io/<seu-repositorio>/
```

Você pode abrir o link no computador ou no celular e compartilhar com quem quiser!
