# Jobs Components

This directory contains modularized components for the Jobs page, following clean code principles.

## Component Structure

```
Jobs/
├── index.js                 # Export barrel for all components
├── useJobsLogic.js          # Custom hook containing all business logic
├── JobCategories.jsx        # Left sidebar with job categories filter
├── JobForm.jsx              # Job creation form component
├── JobCard.jsx              # Individual job post display
├── JobComment.jsx           # Individual comment component
├── JobReply.jsx             # Individual reply component
├── JobApplications.jsx      # Job applications display
└── RecentPosters.jsx        # Right sidebar with recent posters
```

## Design Principles

### 1. Single Responsibility Principle

Each component has a single, well-defined responsibility:

- `JobCategories`: Handles category filtering
- `JobForm`: Handles job creation
- `JobCard`: Displays job information and interactions
- `JobComment`: Handles individual comment display and interactions
- `JobReply`: Handles individual reply display
- `JobApplications`: Handles application-related functionality
- `RecentPosters`: Displays recent job posters

### 2. Separation of Concerns

- **Business Logic**: Centralized in `useJobsLogic.js` custom hook
- **UI Components**: Focus only on rendering and user interactions
- **State Management**: Handled by the custom hook
- **API Calls**: Abstracted through the custom hook

### 3. Reusability

Components are designed to be:

- Self-contained with clear prop interfaces
- Reusable across different contexts
- Easy to test in isolation

### 4. Maintainability

- Clear component boundaries
- Consistent prop naming conventions
- Centralized business logic for easy updates
- Clean import/export structure

## Usage

```jsx
import {
  JobCategories,
  JobForm,
  JobCard,
  RecentPosters,
  useJobsLogic,
} from "../../components/Jobs";

// Use the custom hook for business logic
const jobsData = useJobsLogic();

// Use components with clean prop interfaces
<JobCategories
  jobs={jobs}
  selectedCategory={selectedCategory}
  setSelectedCategory={setSelectedCategory}
/>;
```

## Benefits

1. **Clean Code**: Each component follows SRP and has clear responsibilities
2. **Maintainability**: Changes to business logic only require updates to the hook
3. **Testability**: Components can be easily unit tested
4. **Reusability**: Components can be reused in other parts of the application
5. **Readability**: Code is organized and easy to understand
6. **Scalability**: New features can be added by extending existing components or creating new ones

## API Integration

All API interactions are handled through the `useJobsLogic` hook, maintaining a clean separation between UI and data management. The hook provides:

- Job fetching and management
- Comment and reply functionality
- Application management
- Error and success handling
- Loading states

This ensures that the UI components remain focused on presentation while the hook handles all business logic and API interactions.
