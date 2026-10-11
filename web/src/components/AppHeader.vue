<template>
  <header class="header">
    <RouterLink class="header__brand" to="/">
      <span class="header__logo" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M4 17 10.5 7l3.2 5.2M13 17l2.6-4.2L20 17" />
        </svg>
      </span>
      <span class="header__name">ATV Home</span>
    </RouterLink>
  </header>
</template>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  height: var(--header-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 clamp(18px, 4vw, 48px);
}

.header__brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.header__logo {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  color: #fff;
  background: linear-gradient(150deg, var(--accent-strong), #7b5cff);
  box-shadow: 0 10px 24px rgba(77, 141, 255, 0.35);
  transition: transform var(--dur) var(--ease-spring);
}

.header__brand:hover .header__logo {
  transform: scale(1.08) rotate(-4deg);
}

.header__name {
  font-size: 15px;
}

@media (max-width: 560px) {
  .header__name {
    display: none;
  }
}
</style>
