<template>
  <div class="home">
    <div class="content">
      <h1>Wager</h1>
      <p class="description">
        A platform allowing users to take part in an automated betting market by creating events, providing liquidity to them, and making bets on Mezo. 
      </p>
      <router-link to="/events" class="cta-button">
        <Icon name="compass" size="20" />
        Explore Events
      </router-link>
    </div>
  </div>
</template>

<script setup>
import Icon from '@/components/icons/Icon.vue'
</script>

<style scoped>
.home {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 200px); /* Account for header and footer */
  padding: 0 20px;
}

.content {
  text-align: center;
  max-width: 600px;
}

h1 {
  font-size: 48px;
  margin-bottom: 16px;
  line-height: 1.2;
  background: linear-gradient(45deg, var(--text-primary), var(--brand));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.description {
  font-size: 20px;
  line-height: 1.5;
  color: var(--text-secondary);
  margin-bottom: 40px;
}

.cta-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 32px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-white);
  background: var(--brand);
  border-radius: 12px;
  text-decoration: none;
  transition: transform 0.2s ease, background 0.2s ease;
}

.cta-button:hover {
  transform: translateY(-2px);
  background: var(--btn-primary-bg-hover);
}

.cta-button:active {
  transform: translateY(0);
}

/* Responsive design */
@media (max-width: 768px) {
  h1 {
    font-size: 36px;
  }

  .description {
    font-size: 18px;
  }

  .cta-button {
    padding: 14px 28px;
    font-size: 16px;
  }
}
</style> 
