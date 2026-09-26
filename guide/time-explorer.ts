import { ERA_CHECKPOINTS } from '../src/cosmology.ts';
import { dateYears, NS } from '../src/world-time.ts';
import { writeTimeToUrl } from '../src/time-nav.ts';

// Use the same exact checkpoints and bookmark codec as the game.
const explorer = document.querySelector<HTMLElement>('#era-explorer')!;
const select = document.querySelector<HTMLSelectElement>('#era-select')!;
const slider = document.querySelector<HTMLInputElement>('#era-slider')!;
const title = document.querySelector<HTMLElement>('#era-title')!;
const age = document.querySelector<HTMLElement>('#era-age')!;
const description = document.querySelector<HTMLElement>('#era-description')!;
const visit = document.querySelector<HTMLAnchorElement>('#era-visit')!;
ERA_CHECKPOINTS.forEach((era, index) => {
  const option = document.createElement('option');
  option.value = String(index);
  option.textContent = era.label;
  select.append(option);
});
slider.max = String(ERA_CHECKPOINTS.length - 1);
function show(index: number) {
  const era = ERA_CHECKPOINTS[index];
  select.value = slider.value = String(index);
  slider.setAttribute('aria-valuetext', era.label);
  title.textContent = era.label;
  age.textContent = era.tNs > 0n && era.tNs <= NS
    ? '1 second since the Big Bang'
    : `${dateYears(era.tNs)} years since the Big Bang`;
  description.textContent = era.representation;
  const params = new URLSearchParams();
  writeTimeToUrl(params, era.tNs);
  visit.href = `../?${params.toString()}`;
}
select.addEventListener('change', () => show(Number(select.value)));
slider.addEventListener('input', () => show(Number(slider.value)));
show(5);
explorer.hidden = false;
