# Yanwei Ye / 叶言威

Bilingual academic homepage for Yanwei Ye, built with Jekyll and hosted on
GitHub Pages at [blog.12th.day](https://blog.12th.day).

This site is adapted from
[luost26/academic-homepage](https://github.com/luost26/academic-homepage).

## Local preview

The project uses Ruby Bundler for its Jekyll dependencies:

```bash
bundle install
bundle exec jekyll serve
```

Then open the local URL printed by Jekyll. A production build can be checked
with:

```bash
bundle exec jekyll build
```

## Content editing

- Personal information and education: `_data/profile.yml`
- Navigation and visible sections: `_data/navigation.yml` and `_data/display.yml`
- Author display rules: `_data/authors.yml`
- Publications: `_publications/`
- Custom domain: `CNAME` and `_config.yml`

The portrait is intentionally unset until a personal photo is provided.
Awards, news, blog, and showcase sections are currently disabled.

## Deployment

The repository is intended to be `anyin233.github.io`. GitHub Pages should be
enabled for the repository, with the custom domain set to `blog.12th.day`.
The `CNAME` file is already included, and `_config.yml` uses an empty
`baseurl`, as required for a user-site repository and custom domain.
