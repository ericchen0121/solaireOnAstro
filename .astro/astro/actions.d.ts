declare module "astro:actions" {
	type Actions = typeof import("/Users/eric/Code/freelance/solaireOnAstro/src/actions")["server"];

	export const actions: Actions;
}